# 17 — Security

## Objetivo

Definir las políticas, mecanismos y buenas prácticas de seguridad de la plataforma. Este documento cubre seguridad en todas las capas: red, aplicación, base de datos, almacenamiento y procesos de desarrollo.

---

## Alcance

Cubre seguridad a nivel de frontend, API, base de datos (RLS), almacenamiento, autenticación, manejo de datos sensibles, prevención de ataques comunes (XSS, CSRF, SQL injection, etc.) y procesos de seguridad en el desarrollo.

---

## Dependencias

- 03-non-functional-requirements.md — Define los requisitos de seguridad (NFR-006 a NFR-010).
- 07-database-design.md — Define las políticas RLS.
- 08-authentication.md — Define la autenticación y manejo de sesiones.
- 09-multi-tenancy.md — Define el aislamiento entre tenantes.
- 10-user-roles.md — Define los permisos por rol.

---

## Principios de Seguridad

1. **Defensa en profundidad**: Múltiples capas de seguridad. Si una capa falla, la siguiente la contiene.
2. **Mínimo privilegio**: Cada usuario, cada proceso, cada componente tiene exactamente los permisos necesarios y nada más.
3. **Seguridad por defecto**: Las configuraciones por defecto son las más seguras. El acceso está denegado hasta que se conceda explícitamente.
4. **Nunca confíes en el cliente**: Toda validación del frontend se replica en el backend/RLS.
5. **Registra todo**: Toda acción sensible se registra para auditoría.

---

## Capas de Seguridad

```
┌──────────────────────────────────────────────────────────────┐
│                     CAPA 1: FRONTEND                         │
│  • Validación de entrada (Zod)                              │
│  • Sanitización de HTML                                     │
│  • Content Security Policy (CSP)                             │
│  • HttpOnly cookies para tokens                             │
│  • Ocultación de UI por roles                               │
│  • Rate limiting en formularios                             │
└──────────────────────────────────────────────────────────────┘
                              │
┌──────────────────────────────────────────────────────────────┐
│                     CAPA 2: TRANSPORTE                      │
│  • HTTPS/TLS obligatorio (Vercel + Supabase)                │
│  • HSTS headers                                             │
│  • CORS restringido                                         │
└──────────────────────────────────────────────────────────────┘
                              │
┌──────────────────────────────────────────────────────────────┐
│                     CAPA 3: API / EDGE FUNCTIONS            │
│  • Validación de JWT en cada solicitud                      │
│  • Rate limiting por IP y usuario                           │
│  • Validación de entrada en Edge Functions                  │
│  • Verificación de roles antes de operaciones               │
│  • CORS en Edge Functions                                   │
└──────────────────────────────────────────────────────────────┘
                              │
┌──────────────────────────────────────────────────────────────┐
│                  CAPA 4: BASE DE DATOS (RLS)               │
│  • Row Level Security en TODAS las tablas                   │
│  • Políticas con verificación de tenant_id y rol            │
│  • Funciones SECURITY DEFINER controladas                   │
│  • Sin acceso directo a DB desde frontend                   │
│  (solo a través de Supabase con RLS)                        │
└──────────────────────────────────────────────────────────────┘
                              │
┌──────────────────────────────────────────────────────────────┐
│                  CAPA 5: INFRAESTRUCTURA                   │
│  • Vercel: WAF, DDoS protection, SSL automático             │
│  • Supabase: cifrado en reposo, backups automáticos         │
│  • Secretos en environment variables                        │
│  • Sin hardcodeo de credenciales                            │
└──────────────────────────────────────────────────────────────┘
```

---

## Seguridad en el Frontend

### Content Security Policy (CSP)

Configurar CSP en Vercel para prevenir XSS:

```json
// vercel.json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' https://*.supabase.co data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co; frame-ancestors 'none';"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=31536000; includeSubDomains; preload"
        }
      ]
    }
  ]
}
```

### Validación de entrada con Zod

Todo formulario valida datos antes de enviarlos:

```typescript
import { z } from 'zod';

const bookingSchema = z.object({
  serviceId: z.string().uuid(),
  employeeId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  customerName: z.string().min(2).max(200),
  customerEmail: z.string().email().optional().or(z.literal('')),
  customerPhone: z.string().min(7).max(20).optional().or(z.literal('')),
});

// Uso en el componente
function validateForm(data: unknown) {
  const result = bookingSchema.safeParse(data);
  if (!result.success) {
    // Mapear errores de Zod a errores de formulario
    return result.error.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    }));
  }
  return null;
}
```

### Protección contra XSS

- Vue 3 escapa automáticamente las expresiones en templates (`{{ }}`).
- No usar `v-html` a menos que sea estrictamente necesario y el contenido esté sanitizado.
- Usar `DOMPurify` si se necesita renderizar HTML generado por el usuario (ej: descripciones).

### Almacenamiento Seguro de Tokens

- El JWT de acceso se almacena en memoria (variable reactiva de Pinia).
- Supabase maneja el refresh token en una HttpOnly cookie automáticamente.
- No almacenar tokens en localStorage para prevenir XSS.
- No almacenar datos sensibles en localStorage.

---

## Seguridad en la Base de Datos (RLS)

### Principios RLS

1. **Toda tabla tiene RLS habilitado**.
2. **Política por defecto**: `FOR ALL USING (false)` — denegado por defecto.
3. **Cada política verifica tenant_id y rol**.
4. **Nunca confiar en el cliente**: El frontend puede enviar cualquier tenant_id en una consulta, pero RLS lo ignora y usa el tenant_id del JWT.

### Políticas de Seguridad Críticas

```sql
-- Aislamiento multi-tenant (toda tabla de negocio)
CREATE POLICY "tenant_isolation"
ON {table_name}
FOR ALL
TO authenticated
USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Prevenir que un usuario vea datos de otro tenant incluso como super_admin
-- (el super admin solo accede a través de endpoints específicos)
-- Esto es seguridad adicional: aunque el JWT tenga tenant_id, la policy
-- fuerza que solo vea datos de su tenant.
```

### Funciones SECURITY DEFINER

Las funciones SQL que se ejecutan con `SECURITY DEFINER` deben estar estrictamente controladas:

```sql
-- Solo las funciones necesarias usan SECURITY DEFINER
CREATE FUNCTION get_available_slots(...)
RETURNS TABLE (...)
LANGUAGE plpgsql
SECURITY DEFINER  -- Necesario para leer schedules aunque el usuario no tenga permiso directo
SET search_path = public  -- Prevenir search_path injection
AS $$ ... $$;
```

### Prevención de SQL Injection

- Usar siempre parámetros con nombre (`$1`, `$2`) en funciones SQL.
- Nunca concatenar cadenas en consultas SQL dinámicas.
- Zod valida tipos en el frontend antes de llegar a la consulta.

---

## Seguridad en Edge Functions

### Validación de JWT

Toda Edge Function debe validar el JWT antes de procesar la solicitud:

```typescript
// supabase/edge-functions/_shared/auth.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export async function getUser(req: Request) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const authHeader = req.headers.get('Authorization');

  if (!authHeader) {
    return { user: null, error: 'Missing Authorization header' };
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  return { user, error: error?.message };
}
```

### Rate Limiting en Edge Functions

```typescript
// Implementación simple de rate limiting
const rateLimits = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const record = rateLimits.get(key);

  if (!record || now > record.resetAt) {
    rateLimits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (record.count >= maxRequests) {
    return false; // Rate limit exceeded
  }

  record.count++;
  return true;
}

// Uso
const ip = req.headers.get('x-forwarded-for') || 'unknown';
if (!checkRateLimit(`invite:${ip}`, 10, 60000)) {
  return new Response('Too many requests', { status: 429 });
}
```

### Headers de Seguridad en Edge Functions

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('CORS_ORIGIN') || 'http://localhost:5173',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

// Manejar preflight CORS
if (req.method === 'OPTIONS') {
  return new Response('ok', { headers: corsHeaders });
}
```

---

## Seguridad en Supabase Storage

### Políticas de Storage

```sql
-- Subida solo para usuarios autenticados con rol adecuado
CREATE POLICY "authenticated_upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  (auth.jwt() ->> 'role') IN ('owner', 'admin')
  AND bucket_id IN ('tenant-logos', 'product-images')
);

-- Lectura pública para imágenes de productos y logos
CREATE POLICY "public_read"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id IN ('tenant-logos', 'product-images', 'qr-codes'));

-- Validación de tipo de archivo (desde el frontend y con política)
-- Nota: Supabase Storage no valida tipos MIME por política RLS.
-- La validación debe hacerse en el frontend y en Edge Function si es crítica.
```

### Límites de Archivos

| Tipo               | Tamaño Máximo | Formatos Permitidos |
| ------------------ | ------------- | ------------------- |
| Logo del negocio   | 200KB         | PNG, JPG, WebP      |
| Imagen de producto | 300KB         | PNG, JPG, WebP      |
| Avatar de empleado | 100KB         | PNG, JPG, WebP      |
| QR generado        | 50KB          | PNG                 |

---

## Seguridad en la Autenticación

| Aspecto                    | Implementación                                                              |
| -------------------------- | --------------------------------------------------------------------------- |
| Contraseñas                | Mínimo 8 caracteres, 1 mayúscula, 1 número (validación frontend + Supabase) |
| Hash de contraseñas        | bcrypt (gestionado por Supabase Auth)                                       |
| Bloqueo de cuenta          | 5 intentos fallidos → bloqueo 15 minutos (Supabase Auth)                    |
| Verificación de email      | Obligatoria antes del primer inicio de sesión                               |
| Recuperación de contraseña | Link expira en 1 hora                                                       |
| Sesiones simultáneas       | Permitidas (un usuario puede tener múltiples sesiones)                      |
| Cierre de sesión remoto    | Al cambiar contraseña, todas las sesiones se revocan                        |
| Tiempo de inactividad      | Cerrar sesión después de 2 horas sin actividad                              |

---

## Manejo de Datos Sensibles

| Dato                           | Protección                                                           |
| ------------------------------ | -------------------------------------------------------------------- |
| Contraseñas                    | Hasheadas con bcrypt (Supabase)                                      |
| JWT tokens                     | Firmados con HS256. No contienen datos sensibles                     |
| Información de cliente         | Almacenada en PostgreSQL cifrado en reposo (lo proporciona Supabase) |
| Logs de auditoría              | Sin datos sensibles (no se registran contraseñas ni tokens)          |
| API Keys                       | Solo la anon key está en el frontend (es pública por diseño)         |
| Secretos de servicios externos | En environment variables, nunca en el código                         |

---

## Auditoría de Seguridad

### Eventos Auditados

| Categoría       | Eventos                                                       |
| --------------- | ------------------------------------------------------------- |
| Autenticación   | Login exitoso, login fallido, logout, cambio de contraseña    |
| Usuarios        | Invitación, activación, desactivación, cambio de rol          |
| Tenants         | Creación, suspensión, cambio de plan, cambio de configuración |
| Datos sensibles | Cambios en precios, eliminación de datos                      |
| Seguridad       | Intentos de acceso denegado (403), rate limiting superado     |

### Formato de Auditoría

```sql
-- Tabla audit_logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,        -- 'booking.created', 'user.invited'
  entity_type VARCHAR(50) NOT NULL,    -- 'booking', 'user', 'service'
  entity_id UUID,                       -- ID del recurso afectado
  details JSONB DEFAULT '{}',          -- Detalles adicionales
  ip_address INET,                     -- IP del usuario
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Retención de Logs

- Logs de auditoría: **12 meses**.
- Logs de aplicación (Edge Functions): **30 días**.
- Logs de base de datos (Supabase): Según el plan.

---

## Prevención de Ataques Comunes

| Ataque                           | Mitigación                                                                                     |
| -------------------------------- | ---------------------------------------------------------------------------------------------- |
| **XSS**                          | Vue 3 escapa output automáticamente. CSP headers. No usar `v-html`. Sanitizar HTML de usuario. |
| **CSRF**                         | Supabase usa tokens JWT en header (no cookies). No vulnerable a CSRF clásico.                  |
| **SQL Injection**                | Parámetros con nombre en SQL. Zod valida tipos. RLS limita acceso.                             |
| **Doble reserva**                | Función `get_available_slots` verifica disponibilidad en el momento de INSERT. Transacciones.  |
| **Fuga de datos entre tenantes** | RLS con tenant_id del JWT. Tests automatizados de aislamiento.                                 |
| **Forceful browsing**            | RLS protege endpoints. No hay rutas ocultas accesibles sin autenticación.                      |
| **Denial of Service**            | Rate limiting en API y Edge Functions. Vercel DDoS protection.                                 |
| **Man-in-the-middle**            | HTTPS obligatorio. HSTS headers.                                                               |

---

## Checklist de Seguridad para Despliegue

Antes de cada despliegue a producción, verificar:

- [ ] RLS habilitado en TODAS las tablas de negocio.
- [ ] Políticas RLS probadas con tests automatizados.
- [ ] CSP headers configurados en Vercel.
- [ ] CORS configurado solo para orígenes permitidos.
- [ ] Variables de entorno secretas configuradas (no hardcodeadas).
- [ ] Rate limiting configurado en Edge Functions.
- [ ] Logs de auditoría habilitados.
- [ ] Modo debug/development deshabilitado.
- [ ] Sin API keys de desarrollo en producción.
- [ ] HTTPS forzado (Vercel lo hace automáticamente).
- [ ] HSTS headers configurados.
- [ ] Pruebas de penetración básicas ejecutadas.
- [ ] Revisión manual de políticas RLS.

---

## Decisiones Tomadas

| Decisión                 | Opción                         | Alternativas                 | Justificación                                                                         |
| ------------------------ | ------------------------------ | ---------------------------- | ------------------------------------------------------------------------------------- |
| Autenticación de API     | JWT en header                  | API Key, Basic Auth          | JWT es el estándar moderno. Contiene claims para RLS.                                 |
| Almacenamiento de tokens | Memoria + HttpOnly cookie      | localStorage, sessionStorage | LocalStorage es vulnerable a XSS. HttpOnly cookie previene robo de tokens.            |
| Validación de entrada    | Zod (frontend) + RLS (backend) | Solo backend, Joi, Yup       | Zod es type-safe y se integra bien con TypeScript. RLS es la última línea de defensa. |
| CORS                     | Orígenes explícitos            | Permitir todo                | Solo permitir orígenes conocidos (producción y desarrollo).                           |
| CSP                      | Política restrictiva           | Sin CSP                      | CSP previene XSS incluso si hay una vulnerabilidad en el código.                      |

---

## Posibles Mejoras Futuras

- **Autenticación de dos factores (MFA)**: TOTP para propietarios y admins.
- **Web Application Firewall (WAF)**: Usar Vercel WAF para protección adicional.
- **Análisis de vulnerabilidades**: Escaneo automático de dependencias con Dependabot.
- **Penetration testing**: Contratar servicio de pentesting antes del lanzamiento público.
- **Bug bounty program**: Programa de recompensas para reportes de seguridad.
- **Cifrado de extremo a extremo**: Para datos especialmente sensibles.
- **Cumplimiento GDPR/LGPD**: Políticas de privacidad, derecho al olvido, portabilidad de datos.
- **SOC 2**: Si la plataforma apunta a clientes empresariales.

---

_Documento generado el: 04/07/2026_
_Versión: 1.0_
_Próximo documento: 18-deployment.md_
