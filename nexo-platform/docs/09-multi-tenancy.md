# 09 — Multi-Tenancy

## Objetivo

Definir la estrategia de multi-tenancy de la plataforma, incluyendo el modelo de aislamiento de datos, la identificación del tenant, las políticas RLS, el manejo de dominios/subdominios y las consideraciones de escalabilidad.

---

## Alcance

Cubre el modelo de aislamiento (fila única con tenant_id), la propagación del tenant_id desde el registro hasta las consultas, las políticas RLS, los slugs para URLs públicas y la estrategia de escalamiento futuro.

---

## Dependencias

- 05-system-architecture.md — Define el principio de multi-tenant por diseño.
- 07-database-design.md — Define tenant_id en todas las tablas.
- 08-authentication.md — Define cómo el tenant_id se inyecta en el JWT.

---

## Modelo de Aislamiento: Single Row Isolation

### Estrategia Elegida

Usamos **Fila Única con tenant_id** (Single Row / Discriminador de Columna). Todos los tenantes comparten la misma base de datos y las mismas tablas. Cada fila tiene una columna `tenant_id` que referencia al tenant propietario.

```
┌─────────────────────────────────────────────────┐
│                 Tabla: bookings                  │
├──────┬──────────────────────┬────────────────────┤
│  id  │      tenant_id       │      ...           │
├──────┼──────────────────────┼────────────────────┤
│  1   │  tenant-aaa          │  ...               │
│  2   │  tenant-aaa          │  ...               │  ← Datos del Tenant A
│  3   │  tenant-bbb          │  ...               │  ← Datos del Tenant B
│  4   │  tenant-aaa          │  ...               │
│  5   │  tenant-ccc          │  ...               │  ← Datos del Tenant C
└──────┴──────────────────────┴────────────────────┘
```

### ¿Por qué esta estrategia?

| Estrategia                 | Complejidad | Aislamiento | Escalabilidad               | Mantenimiento |
| -------------------------- | ----------- | ----------- | --------------------------- | ------------- |
| **Fila única (tenant_id)** | Baja        | Medio       | Alta (hasta ~1000 tenantes) | Bajo          |
| Schema por tenant          | Media       | Alto        | Muy alta                    | Medio         |
| Base de datos por tenant   | Alta        | Máximo      | Ilimitado                   | Alto          |

**Decisión**: Elegimos fila única porque:

1. **Simplicidad operativa**: Una base de datos, un schema, migraciones únicas.
2. **Costo inicial**: No necesitamos infraestructura compleja para < 1000 tenantes.
3. **Desarrollo ágil**: Los cambios de schema afectan a todos los tenantes a la vez.
4. **Consultas cross-tenant**: El super admin puede consultar todos los tenantes fácilmente.
5. **Backup único**: Toda la plataforma se respalda junta.

**Límite**: Esta estrategia es óptima hasta ~1000 tenantes activos. Más allá, considerar migrar a schemas por tenant.

---

## Propagación del Tenant ID

El tenant_id viaja desde el registro del negocio hasta cada consulta a través de las siguientes capas:

### 1. Registro → Creación de Tenant

```
Usuario completa registro
        │
        ▼
Supabase Auth crea usuario
        │
        ▼
Hook AFTER INSERT en auth.users:
  1. Crea tenant en tabla `tenants`
  2. Crea usuario en tabla `users` con ese tenant_id
  3. Inyecta tenant_id en app_metadata del JWT
```

### 2. JWT → Cliente Supabase

```
Frontend recibe JWT con app_metadata.tenant_id
        │
        ▼
supabase-js envía JWT en cada request (Authorization header)
        │
        ▼
Supabase extrae tenant_id del JWT auth.jwt() ->> 'tenant_id'
        │
        ▼
RLS policy compara: tenant_id = auth.jwt() ->> 'tenant_id'
```

### 3. RLS → Consultas Seguras

```sql
-- Cada policy usa el tenant_id del JWT para filtrar
CREATE POLICY "tenant_isolation_policy"
ON bookings
FOR ALL
USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
```

---

## Políticas RLS por Tipo de Tabla

### Tablas de negocio (protegidas)

Estas tablas solo son accesibles por usuarios autenticados del tenant:

`bookings`, `services`, `employees`, `schedules`, `holiday_exceptions`, `customers`, `customer_notes`, `tags`, `customer_tags`, `loyalty_points`, `loyalty_config`, `orders`, `order_items`, `categories`, `products`, `product_variants`, `extra_groups`, `extras`, `tables`, `menus`

**Política estándar**:

```sql
CREATE POLICY "tenant_data_isolation"
ON {table_name}
FOR ALL
TO authenticated
USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
```

### Tablas del sistema (multi-tenant)

`users`:

```sql
-- SELECT: solo usuarios del mismo tenant O super_admin
CREATE POLICY "users_select"
ON users
FOR SELECT
TO authenticated
USING (
  tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  OR (auth.jwt() ->> 'is_super_admin')::boolean = true
);

-- INSERT/UPDATE/DELETE: solo admin/owner del mismo tenant
CREATE POLICY "users_manage"
ON users
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  AND (auth.jwt() ->> 'role') IN ('owner', 'admin')
);
```

### Tablas públicas (sin autenticación)

`tenants`: lectura pública del perfil del negocio.
`products`, `categories`, `menus`: lectura pública (solo items activos).
`tables`: lectura pública (solo número y QR).
`bookings`: INSERT público con validaciones.

```sql
-- Productos visibles al público
CREATE POLICY "public_products_select"
ON products
FOR SELECT
TO anon
USING (
  tenant_id = (SELECT id FROM tenants WHERE slug = current_setting('app.current_slug', true))
  AND is_available = true
  AND deleted_at IS NULL
);
```

---

## Manejo de Slugs y URLs Públicas

Cada tenant tiene un `slug` único que se usa para las URLs públicas.

### Formato del Slug

- Generado automáticamente a partir del nombre del negocio.
- Solo minúsculas, números y guiones.
- Único en toda la plataforma.
- Ejemplo: `"Cafetería El Árabe"` → `"cafeteria-el-arabe"`

### URLs Públicas

```
Portal de reservas:    https://nexo.app/public/{slug}/booking
Carta digital:         https://nexo.app/public/{slug}/menu
Seguimiento de pedido: https://nexo.app/public/{slug}/order/{order_id}
```

### Resolución del Slug

Para consultas públicas (sin JWT), el slug se pasa como parámetro de consulta o en la URL. El frontend lo resuelve obteniendo el tenant_id:

```sql
-- Obtener tenant_id desde el slug
SELECT id FROM tenants WHERE slug = 'mi-negocio' AND deleted_at IS NULL AND status IN ('trial', 'active');
```

Luego las consultas RLS públicas usan ese tenant_id:

```sql
-- Función para obtener tenant_id desde slug
CREATE OR REPLACE FUNCTION get_tenant_id_from_slug(p_slug TEXT)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT id FROM tenants WHERE slug = p_slug AND deleted_at IS NULL AND status IN ('trial', 'active');
$$;
```

---

## Auto-aislamiento mediante Índices

Todos los índices compuestos tienen `tenant_id` como primera columna para garantizar que las consultas multi-tenant sean eficientes:

```sql
-- Buenos: tenant_id primero
CREATE INDEX idx_bookings_tenant_date ON bookings(tenant_id, date);
CREATE INDEX idx_products_tenant_category ON products(tenant_id, category_id);
CREATE INDEX idx_customers_tenant ON customers(tenant_id, created_at DESC);

-- Malo: tenant_id no está primero (no se beneficiaría del particionamiento lógico)
-- CREATE INDEX idx_bookings_date ON bookings(date);
```

---

## Funciones Utilitarias para el Tenant

### Comprobar si un módulo está activo

```sql
CREATE OR REPLACE FUNCTION is_module_active(p_module TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT (modules->>p_module)::boolean FROM tenants WHERE id = (auth.jwt() ->> 'tenant_id')::uuid),
    false
  );
$$;
```

### Obtener configuración del tenant

```sql
CREATE OR REPLACE FUNCTION get_tenant_config()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT config FROM tenants WHERE id = (auth.jwt() ->> 'tenant_id')::uuid;
$$;
```

---

## Verificación de Aislamiento (Testing)

Se deben implementar tests automatizados que verifiquen el aislamiento:

```typescript
// tests/e2e/specs/multi-tenant-isolation.spec.ts
test('tenant A no puede acceder a datos de tenant B', async () => {
  // 1. Autenticarse como tenant A
  const tenantA = await loginAs('owner', 'tenant-a');

  // 2. Obtener IDs de servicios de tenant A
  const { data: servicesA } = await supabase.from('services').select('id');

  // 3. Autenticarse como tenant B
  const tenantB = await loginAs('owner', 'tenant-b');

  // 4. Intentar acceder a servicios de tenant A
  const { data: servicesB } = await supabase.from('services').select('id');

  // 5. Verificar que ningún ID de tenant A está en los resultados de tenant B
  const idsA = new Set(servicesA.map((s) => s.id));
  const idsB = new Set(servicesB.map((s) => s.id));

  expect(idsA.intersection(idsB).size).toBe(0);
});
```

---

## Estrategia de Migración Futura

Si la plataforma supera los ~1000 tenantes activos, se puede migrar a **schemas por tenant**:

### Esquema de Migración

```
Fase 1 (actual):         Una tabla + tenant_id + RLS
Fase 2 (1000+ tenantes): Un schema por tenant + tabla compartida para metadata
Fase 3 (10000+):         Base de datos por tenant + sharding geográfico
```

### Abstracción para la Migración

Para facilitar la migración futura, el acceso a datos se abstrae mediante repositorios:

```typescript
// repositories/booking.repository.ts
// Esta abstracción permite cambiar la estrategia de multi-tenancy
// sin modificar los componentes ni las stores

export const bookingRepository = {
  async getByDate(date: string): Promise<Booking[]> {
    // Actual: consulta directa con RLS (tenant_id en JWT)
    const { data } = await supabase
      .from('bookings')
      .select('*')
      .gte('date', date)
      .lt('date', addDays(date, 1));

    // Futuro: si migramos a schemas por tenant:
    // const { data } = await supabase
    //   .schema(tenantId)
    //   .from('bookings')
    //   ...

    return data ?? [];
  },
};
```

---

## Tenant ID en Edge Functions

Las Edge Functions reciben el tenant_id del JWT:

```typescript
// supabase/edge-functions/_shared/supabase-client.ts
export function getTenantId(req: Request): string | null {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;

  // El JWT se puede decodificar (no verificar, solo extraer claims)
  const token = authHeader.replace('Bearer ', '');
  const payload = JSON.parse(atob(token.split('.')[1]));
  return payload?.app_metadata?.tenant_id ?? null;
}
```

---

## Consideraciones de Cache

El `tenant_id` se cachea en el frontend a través de la store de auth. No se persiste en localStorage por seguridad (prevención de XSS). Se obtiene de la sesión activa de Supabase, que maneja el refresh automáticamente.

---

## Decisiones Tomadas

| Decisión                        | Opción                    | Alternativas                             | Justificación                                                                                             |
| ------------------------------- | ------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Modelo de aislamiento           | Fila única (tenant_id)    | Schema por tenant, DB por tenant         | Simplicidad operativa para el rango esperado (< 1000 tenantes).                                           |
| Propagación de tenant_id        | JWT custom claims         | Header manual, tabla de sesiones         | Integración nativa con RLS. No requiere lógica adicional en cada consulta.                                |
| URLs públicas                   | Slug en path              | Subdominio por tenant (tenant.miweb.com) | Simplicidad de DNS y SSL. No requiere wildcard certificates.                                              |
| Separación de datos de clientes | Misma tabla con tenant_id | Tablas separadas por tenant              | Los clientes de diferentes tenantes pueden tener el mismo email (cada tenant tiene sus propios clientes). |
| Módulos activos                 | JSONB en tabla tenants    | Tabla separada módulos_tenants           | JSONB es flexible y permite añadir/quitar módulos sin migration.                                          |

---

## Posibles Mejoras Futuras

- **Subdominios por tenant** (`mi-negocio.nexo.app`) cuando la plataforma tenga suficientes tenantes para justificar la configuración de DNS wildcard.
- **Dominios personalizados** (`carta.mi-negocio.com`) para negocios que quieran su propio dominio.
- **Schemas por tenant** usando `CREATE SCHEMA IF NOT EXISTS tenant_{id}` y search_path dinámico.
- **Caché de tenant_id** en Redis para acelerar la resolución de slugs en endpoints públicos.
- **Pool de conexiones por tenant** si la carga de un tenant específico requiere aislamiento de recursos.
- **Sharding geográfico** para cumplimiento de regulaciones de datos (GDPR, LGPD).

---

_Documento generado el: 04/07/2026_
_Versión: 1.0_
_Próximo documento: 10-user-roles.md_
