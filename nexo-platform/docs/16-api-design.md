# 16 — API Design

## Objetivo

Definir el diseño de la API de la plataforma. La mayoría de las operaciones se realizan mediante el cliente `supabase-js` con RLS. Este documento cubre los endpoints, las Edge Functions, los patrones de consulta, la paginación, el filtrado y los formatos de respuesta.

---

## Alcance

Cubre el diseño de la API REST (a través de Supabase), las Edge Functions personalizadas, los patrones de consulta comunes, la paginación, la ordenación, el filtrado y las convenciones de errores.

---

## Dependencias

- 05-system-architecture.md — Define que la comunicación es vía supabase-js + Edge Functions.
- 07-database-design.md — Define las tablas que se exponen vía API.
- 08-authentication.md — Define cómo el JWT autentica las solicitudes.
- 17-security.md — Define las políticas de seguridad de la API.

---

## Estrategia General de API

La plataforma usa dos modos de comunicación con el backend:

### 1. Cliente Supabase (CRUD directo con RLS)

**Cuándo usar**: Operaciones CRUD estándar donde la autorización puede manejarse mediante RLS.

**Cómo funciona**:

- El frontend usa `supabase-js` para hacer consultas directamente a PostgreSQL.
- Las RLS policies verifican `tenant_id` y `role` del JWT automáticamente.
- No hay round-trip a un servidor intermedio.
- Las respuestas son en formato JSON estándar de Supabase.

```
Frontend → supabase.from('bookings').select('*') → PostgreSQL (RLS) → Response
```

**Ventajas**:

- Baja latencia (sin servidor intermedio).
- Menos código de backend.
- La seguridad está en la base de datos, la capa más cercana a los datos.

**Limitaciones**:

- No apto para lógica de negocio compleja.
- No apto para operaciones que requieren servicios externos.
- No apto para operaciones que no pueden expresarse en SQL.

### 2. Edge Functions (Lógica de servidor)

**Cuándo usar**: Operaciones que requieren lógica de negocio, integración con servicios externos, o que no pueden manejarse solo con RLS.

**Cómo funciona**:

- El frontend invoca una Edge Function mediante fetch/Axios.
- La función ejecuta lógica en Deno (TypeScript).
- Puede usar el cliente Supabase internamente para leer/escribir datos.
- Responde con JSON estándar.

```
Frontend → POST /functions/v1/send-email → Edge Function (Deno) → Response
```

---

## Patrones de Consulta con supabase-js

### Consultas Básicas

```typescript
// Obtener servicios del tenant actual (RLS filtra automáticamente)
const { data: services, error } = await supabase.from('services').select('*').order('sort_order');

// Obtener citas de una fecha específica
const { data: bookings } = await supabase
  .from('bookings')
  .select('*, service:service_id(*), employee:employee_id(*)')
  .gte('date', today)
  .lt('date', tomorrow)
  .order('start_time');
```

### Paginación

Todas las consultas que devuelven listas deben paginarse.

```typescript
interface PaginationParams {
  page: number;
  perPage: number; // default: 20, max: 100
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  perPage: number;
  totalPages: number;
}

// Implementación
async function getPaginatedCustomers(params: PaginationParams) {
  const from = (params.page - 1) * params.perPage;
  const to = from + params.perPage - 1;

  const { data, count } = await supabase
    .from('customers')
    .select('*', { count: 'exact' })
    .order(params.sortBy || 'created_at', { ascending: params.sortOrder === 'asc' })
    .range(from, to);

  return {
    data: data ?? [],
    count: count ?? 0,
    page: params.page,
    perPage: params.perPage,
    totalPages: Math.ceil((count ?? 0) / params.perPage),
  };
}
```

### Filtrado

```typescript
// Filtros de texto (búsqueda)
supabase
  .from('customers')
  .select('*')
  .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`);

// Filtros por array (etiquetas)
supabase
  .from('customers')
  .select('*, customer_tags!inner(tag_id)')
  .in('customer_tags.tag_id', selectedTagIds);

// Filtros por rango de fechas
supabase.from('bookings').select('*').gte('date', dateFrom).lte('date', dateTo);

// Filtros por múltiples condiciones
supabase
  .from('products')
  .select('*')
  .eq('category_id', categoryId)
  .eq('is_available', true)
  .is('deleted_at', null);
```

---

## Edge Functions (API Personalizada)

### Lista de Edge Functions

| Endpoint                                  | Método      | Propósito                            | Autenticación              |
| ----------------------------------------- | ----------- | ------------------------------------ | -------------------------- |
| `/functions/v1/send-booking-confirmation` | POST        | Enviar email de confirmación de cita | Service Role Key (trigger) |
| `/functions/v1/send-order-notification`   | POST        | Notificar nuevo pedido al negocio    | Service Role Key (trigger) |
| `/functions/v1/invite-employee`           | POST        | Invitar empleado por email           | JWT (owner/admin)          |
| `/functions/v1/process-loyalty-points`    | POST        | Calcular y acreditar puntos          | Service Role Key (trigger) |
| `/functions/v1/export-csv`                | POST        | Exportar datos a CSV                 | JWT (owner/admin)          |
| `/functions/v1/generate-qr-pdf`           | POST        | Generar PDF con QRs de mesas         | JWT (owner/admin)          |
| `/functions/v1/expire-loyalty-points`     | POST (cron) | Marcar puntos vencidos               | Service Role Key (cron)    |
| `/functions/v1/auto-tag-customers`        | POST (cron) | Asignar tags automáticas             | Service Role Key (cron)    |

### Formato de Solicitud y Respuesta

```typescript
// Formato estándar de solicitud
interface ApiRequest<T> {
  body: T;
  headers: {
    Authorization: string; // Bearer JWT
    'Content-Type': 'application/json';
  };
}

// Formato estándar de respuesta exitosa
interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

// Formato estándar de respuesta de error
interface ApiErrorResponse {
  success: false;
  error: {
    code: string; // Código de error interno (ej: 'SLOT_UNAVAILABLE')
    message: string; // Mensaje legible
    details?: unknown; // Detalles adicionales (opcional)
  };
}
```

### Ejemplo: `invite-employee`

```typescript
// supabase/edge-functions/invite-employee/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createSupabaseClient } from '../_shared/supabase-client.ts';

interface InviteRequest {
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'employee';
}

Deno.serve(async (req) => {
  // 1. Validar método
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  // 2. Validar autenticación
  const supabase = createSupabaseClient(req);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  // 3. Validar rol (solo owner/admin)
  const role = user.app_metadata?.role;
  if (!['owner', 'admin'].includes(role)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }

  // 4. Validar body
  const body: InviteRequest = await req.json();
  if (!body.email || !body.first_name || !body.last_name || !body.role) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
  }

  // 5. Invitar usuario via Supabase Admin API
  const { data: invite, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
    body.email,
    {
      data: {
        tenant_id: user.app_metadata?.tenant_id,
        role: body.role,
        first_name: body.first_name,
        last_name: body.last_name,
      },
    },
  );

  if (inviteError) {
    return new Response(JSON.stringify({ error: inviteError.message }), { status: 400 });
  }

  // 6. Registrar en audit_log
  await supabase.from('audit_logs').insert({
    tenant_id: user.app_metadata?.tenant_id,
    user_id: user.id,
    action: 'user.invited',
    entity_type: 'user',
    details: { email: body.email, role: body.role },
  });

  // 7. Responder
  return new Response(
    JSON.stringify({
      success: true,
      data: { invited: true, email: body.email },
    }),
    { status: 200 },
  );
});
```

---

## Endpoints de Supabase (Tablas)

La API de Supabase expone automáticamente todas las tablas como endpoints REST. A continuación se listan los endpoints principales:

### Tablas del Sistema

| Tabla                 | SELECT                 | INSERT       | UPDATE      | DELETE       | Notas                                  |
| --------------------- | ---------------------- | ------------ | ----------- | ------------ | -------------------------------------- |
| `/rest/v1/tenants`    | Público (solo activos) | Solo sistema | Propietario | Solo sistema | El slug se usa para consultas públicas |
| `/rest/v1/users`      | Mismo tenant           | Owner/Admin  | Owner/Admin | Solo sistema |                                        |
| `/rest/v1/audit_logs` | Super admin + tenant   | Solo sistema | Nunca       | Nunca        | Solo inserción por triggers            |

### Tablas de Citas

| Tabla                         | SELECT            | INSERT          | UPDATE         | DELETE      | Notas |
| ----------------------------- | ----------------- | --------------- | -------------- | ----------- | ----- |
| `/rest/v1/services`           | Tenant + público  | Admin/Owner     | Admin/Owner    | Soft delete |
| `/rest/v1/employees`          | Tenant            | Admin/Owner     | Admin/Owner    | Soft delete |
| `/rest/v1/employee_services`  | Tenant            | Admin/Owner     | Admin/Owner    | Admin/Owner |
| `/rest/v1/schedules`          | Tenant + empleado | Admin/Owner     | Admin/Owner    | Admin/Owner |
| `/rest/v1/schedule_breaks`    | Tenant + empleado | Admin/Owner     | Admin/Owner    | Admin/Owner |
| `/rest/v1/holiday_exceptions` | Tenant            | Admin/Owner     | Admin/Owner    | Admin/Owner |
| `/rest/v1/bookings`           | Tenant + cliente  | Público + admin | Empleado/Admin | Soft delete |

### Tablas de Carta Digital

| Tabla                       | SELECT           | INSERT          | UPDATE      | DELETE      | Notas |
| --------------------------- | ---------------- | --------------- | ----------- | ----------- | ----- |
| `/rest/v1/menus`            | Tenant           | Admin/Owner     | Admin/Owner | Soft delete |
| `/rest/v1/categories`       | Tenant + público | Admin/Owner     | Admin/Owner | Soft delete |
| `/rest/v1/products`         | Tenant + público | Admin/Owner     | Admin/Owner | Soft delete |
| `/rest/v1/product_variants` | Tenant + público | Admin/Owner     | Admin/Owner | Admin/Owner |
| `/rest/v1/extra_groups`     | Tenant + público | Admin/Owner     | Admin/Owner | Admin/Owner |
| `/rest/v1/extras`           | Tenant + público | Admin/Owner     | Admin/Owner | Admin/Owner |
| `/rest/v1/tables`           | Tenant + público | Admin/Owner     | Admin/Owner | Soft delete |
| `/rest/v1/orders`           | Tenant           | Público (crear) | Empleado    | Nunca       |
| `/rest/v1/order_items`      | Tenant           | Público (crear) | Empleado    | Nunca       |

### Tablas de CRM

| Tabla                     | SELECT           | INSERT             | UPDATE           | DELETE             | Notas |
| ------------------------- | ---------------- | ------------------ | ---------------- | ------------------ | ----- |
| `/rest/v1/customers`      | Tenant           | Sistema + empleado | Empleado/Cliente | Soft delete        |
| `/rest/v1/customer_notes` | Tenant           | Empleado           | Empleado (5 min) | Solo super admin   |
| `/rest/v1/tags`           | Tenant           | Admin/Owner        | Admin/Owner      | No eliminar system |
| `/rest/v1/customer_tags`  | Tenant           | Empleado           | Empleado         | Admin/Owner        |
| `/rest/v1/loyalty_points` | Tenant + cliente | Sistema            | Sistema          | Solo lectura       |
| `/rest/v1/loyalty_config` | Tenant           | Owner              | Owner            | Solo owner         |

---

## Vistas y Funciones Expuestas vía API

Además de las tablas, se exponen vistas y funciones SQL como endpoints:

```sql
-- Vista de resumen de cliente (expuesta como endpoint)
CREATE VIEW v_customer_summary AS ...;
-- Acceso: supabase.from('v_customer_summary').select('*')

-- Función de slots disponibles (expuesta como RPC)
-- Acceso: supabase.rpc('get_available_slots', { ... })
CREATE FUNCTION get_available_slots(p_tenant_id, p_employee_id, p_date, p_service_duration)
RETURNS TABLE (start_time TIME, end_time TIME) AS ...;
```

```typescript
// Uso en frontend
const { data: slots } = await supabase.rpc('get_available_slots', {
  p_tenant_id: tenantId,
  p_employee_id: employeeId,
  p_date: selectedDate,
  p_service_duration: serviceDuration,
});
```

---

## Formato de Respuesta de Supabase

Supabase devuelve respuestas en el siguiente formato:

```typescript
// Éxito (objeto único)
{ data: Booking, error: null }

// Éxito (lista)
{ data: Booking[], count: number, error: null }

// Error
{ data: null, error: { message: string, details: string, hint: string, code: string } }

// Códigos de error comunes:
// 'PGRST116' — El recurso no existe (404)
// '42501' — RLS policy violation (403)
// '23505' — Unique violation (409)
// '23503' — Foreign key violation (400)
```

---

## Almacenamiento (Supabase Storage)

Las imágenes y archivos se gestionan mediante Supabase Storage con RLS.

### Buckets

| Bucket             | Visibilidad      | Propósito             |
| ------------------ | ---------------- | --------------------- |
| `tenant-logos`     | Público          | Logos de negocios     |
| `product-images`   | Público          | Imágenes de productos |
| `employee-avatars` | Privado (tenant) | Avatares de empleados |
| `qr-codes`         | Público          | Imágenes QR generadas |

### Políticas de Storage

```sql
-- Bucket público: cualquier persona puede leer
CREATE POLICY "public_read"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id IN ('tenant-logos', 'product-images', 'qr-codes'));

-- Bucket privado: solo usuarios del tenant pueden leer
CREATE POLICY "tenant_read_avatars"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'employee-avatars'
  AND (storage.foldername(name))[1] = (auth.jwt() ->> 'tenant_id')
);

-- Subida: solo admin/owner
CREATE POLICY "tenant_upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id IN ('tenant-logos', 'product-images', 'qr-codes')
  AND (auth.jwt() ->> 'role') IN ('owner', 'admin')
);
```

### Subida de archivos desde el frontend

```typescript
async function uploadProductImage(file: File, productId: string): Promise<string> {
  const tenantId = useAuthStore().tenantId;
  const filePath = `${tenantId}/products/${productId}/${file.name}`;

  const { data, error } = await supabase.storage.from('product-images').upload(filePath, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type,
  });

  if (error) throw error;

  // Obtener URL pública
  const {
    data: { publicUrl },
  } = supabase.storage.from('product-images').getPublicUrl(filePath);

  return publicUrl;
}
```

---

## Convenciones de Nombres en la API

| Elemento            | Convención                                | Ejemplo                                   |
| ------------------- | ----------------------------------------- | ----------------------------------------- |
| Tablas              | snake_case, plural                        | `bookings`, `order_items`                 |
| Columnas            | snake_case                                | `tenant_id`, `first_name`                 |
| Funciones RPC       | snake_case, prefijo `get_` o `calculate_` | `get_available_slots`                     |
| Endpoints EF        | kebab-case                                | `/functions/v1/send-booking-confirmation` |
| Parámetros RPC      | prefijo `p_`                              | `p_tenant_id`, `p_date`                   |
| Parámetros EF       | camelCase en body                         | `{ firstName, email }`                    |
| Archivos de storage | `{tenant_id}/{entity}/{id}/{file}`        | `tenant-abc/products/123/foto.jpg`        |

---

## Rate Limiting

Supabase aplica rate limiting a nivel de proyecto. Configuración recomendada:

| Endpoint             | Límite           | Ventana  |
| -------------------- | ---------------- | -------- |
| Auth (login, signup) | 5 solicitudes    | 1 minuto |
| API REST (lectura)   | 100 solicitudes  | 1 minuto |
| API REST (escritura) | 30 solicitudes   | 1 minuto |
| Storage (subida)     | 10 solicitudes   | 1 minuto |
| Edge Functions       | Depende del plan | —        |

---

## Caché

| Tipo                        | Cache-Control              | Implementación                |
| --------------------------- | -------------------------- | ----------------------------- |
| Datos públicos (menú)       | `public, max-age=300`      | CDN de Supabase               |
| Datos del tenant            | `private, max-age=60`      | Cliente supabase-js           |
| Sesión JWT                  | No cache                   | Cliente supabase-js           |
| Imágenes (logos, productos) | `public, max-age=31536000` | CDN de Supabase + hash en URL |

---

## Decisiones Tomadas

| Decisión                | Opción                                  | Alternativas               | Justificación                                                                       |
| ----------------------- | --------------------------------------- | -------------------------- | ----------------------------------------------------------------------------------- |
| API principal           | supabase-js directo                     | REST API propia, GraphQL   | Menos código, menor latencia, seguridad nativa con RLS.                             |
| Edge Functions          | Para lógica compleja                    | Todo vía RLS, todo vía API | Balance entre simplicidad (RLS para CRUD) y flexibilidad (EF para lógica compleja). |
| Paginación              | Range-based                             | Cursor-based, offset-based | Supabase soporta range() nativamente. Simple de implementar.                        |
| Formato de errores      | `{ success, error: { code, message } }` | Solo HTTP status codes     | Proporciona más contexto para el frontend.                                          |
| Organización de storage | `{tenant_id}/{entity}/{id}`             | Plano                      | Escalable y fácil de navegar. Permite aplicar RLS por carpeta.                      |

---

## Posibles Mejoras Futuras

- **API Key pública**: Para que terceros puedan integrarse con la plataforma (si se abre la API).
- **Webhooks**: Notificar a sistemas externos cuando ocurren eventos (nueva cita, nuevo pedido, nuevo cliente).
- **GraphQL**: Usar Hasura o Graphile para consultas más flexibles y eficientes.
- **Documentación OpenAPI/Swagger**: Para la API pública de Edge Functions.
- **Versionado de API**: Prefijo `/v1/` en Edge Functions para permitir cambios sin breaking changes.
- **Clientes generados**: Generar cliente TypeScript automáticamente desde OpenAPI.
- **Bulk operations**: Endpoints para operaciones masivas (importar clientes, actualizar precios).

---

_Documento generado el: 04/07/2026_
_Versión: 1.0_
_Próximo documento: 17-security.md_
