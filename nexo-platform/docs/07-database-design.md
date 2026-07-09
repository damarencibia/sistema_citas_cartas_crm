# 07 — Database Design

## Objetivo

Definir el diseño completo de la base de datos PostgreSQL: esquemas, tablas, relaciones, índices, políticas RLS, triggers y funciones. Este documento es el plano para todas las migraciones de base de datos.

---

## Alcance

Cubre todas las tablas de los módulos iniciales (Base, Citas, Carta Digital, CRM) y las tablas transversales (tenants, usuarios, roles). Incluye diseño lógico y físico.

---

## Dependencias

- 04-tech-stack.md — Define PostgreSQL 15 + RLS + Supabase.
- 05-system-architecture.md — Define la estrategia multi-tenant (fila única con tenant_id).
- 02-functional-requirements.md — Define funcionalidades que la base de datos debe soportar.
- 10-user-roles.md — Define roles y permisos que las RLS policies implementan.

---

## Principios de Diseño

1. **tenant_id en todas las tablas**: Toda tabla de datos de negocio tiene `tenant_id` como referencia al tenant.
2. **UUID como PK**: Todas las tablas usan UUID v4 como clave primaria (seguridad, escalabilidad, no secuencial).
3. **Timestamps automáticos**: Todas las tablas tienen `created_at` y `updated_at` con defaults automáticos.
4. **Soft delete**: Los registros no se eliminan físicamente; tienen un campo `deleted_at` (nullable).
5. **RLS por defecto**: Todas las tablas tienen RLS habilitado con policies restrictivas.
6. **Integridad referencial**: Foreign keys con restricciones de integridad.
7. **JSONB para datos flexibles**: Se usa JSONB solo cuando la estructura puede variar (configuraciones, metadatos).
8. **Índices compuestos**: El primer campo del índice es siempre `tenant_id` para las consultas multi-tenant.

---

## Convenciones

| Elemento            | Convención                 | Ejemplo                                         |
| ------------------- | -------------------------- | ----------------------------------------------- |
| Nombres de tablas   | plural, snake_case         | `bookings`, `service_categories`                |
| Nombres de columnas | snake_case                 | `tenant_id`, `first_name`                       |
| Primary keys        | `id` (UUID)                | `id UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| Foreign keys        | `{tabla}_id`               | `tenant_id`, `service_id`, `employee_id`        |
| Timestamps          | `created_at`, `updated_at` | `created_at TIMESTAMPTZ NOT NULL DEFAULT now()` |
| Soft delete         | `deleted_at`               | `deleted_at TIMESTAMPTZ DEFAULT NULL`           |
| Status              | `status` (VARCHAR o ENUM)  | `status VARCHAR(20) NOT NULL DEFAULT 'active'`  |
| Booleanos           | `is_` prefijo              | `is_available`, `is_active`                     |
| Precios             | INTEGER (centavos)         | `price INTEGER NOT NULL CHECK (price >= 0)`     |

---

## Diagrama Entidad-Relación (Texto)

```
┌─────────────┐     ┌──────────────┐     ┌──────────────────┐
│   tenants   │─────│    users     │     │  user_roles      │
└─────────────┘     └──────────────┘     └──────────────────┘
       │                                       │
       │                                       │
       ├────────────────────────────────────────┘
       │
       ├── ── ── ── ── ── ── ── ── ── ── ── ── ──
       │
       │  ┌──────────────┐    ┌──────────────┐
       │  │  services    │────│  employee_    │
       │  └──────────────┘    │  services     │
       │       │             └──────────────┘
       │       │                    │
       │       │             ┌──────────────┐
       │       │             │  employees   │
       │       │             └──────────────┘
       │       │                    │
       │       │             ┌──────────────┐
       │       └─────────────│  bookings    │
       │                     └──────────────┘
       │
       │  ┌──────────────┐    ┌──────────────┐
       │  │  categories  │────│  products    │
       │  └──────────────┘    └──────┬───────┘
       │                             │
       │                    ┌────────┴────────┐
       │                    │                 │
       │             ┌──────┴──────┐  ┌───────┴───────┐
       │             │  variants   │  │  product_extras│
       │             └─────────────┘  └───────────────┘
       │
       │  ┌──────────────┐    ┌──────────────┐
       │  │    tables    │    │    orders    │
       │  └──────────────┘    └──────┬───────┘
       │                             │
       │                     ┌───────┴───────┐
       │                     │  order_items  │
       │                     └───────────────┘
       │
       │  ┌──────────────┐    ┌──────────────┐
       │  │  customers   │────│  customer_   │
       │  └──────────────┘    │  tags         │
       │       │             └──────────────┘
       │       │                    │
       │       │             ┌──────────────┐
       │       │             │    tags      │
       │       │             └──────────────┘
       │       │
       │       ├── ── customer_notes
       │       ├── ── customer_bookings (view)
       │       ├── ── customer_orders (view)
       │
       │  ┌──────────────────┐
       │  │  loyalty_points   │
       │  └──────────────────┘
       │
       │  ┌──────────────────┐
       │  │  schedules        │
       │  └──────────────────┘
       │
       │  ┌──────────────────┐
       │  │  holiday_exceptions│
       │  └──────────────────┘
       │
       │  ┌──────────────────┐
       │  │  audit_logs       │
       │  └──────────────────┘
```

---

## Definición de Tablas

### Tablas del Sistema (Base)

#### `tenants`

| Columna                | Tipo           | Restricciones                                                                              | Descripción                              |
| ---------------------- | -------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------- |
| `id`                   | `UUID`         | `PK DEFAULT gen_random_uuid()`                                                             | Identificador único del tenant           |
| `name`                 | `VARCHAR(255)` | `NOT NULL UNIQUE`                                                                          | Nombre del negocio                       |
| `slug`                 | `VARCHAR(100)` | `NOT NULL UNIQUE`                                                                          | Slug para URL pública (ej: `mi-negocio`) |
| `email`                | `VARCHAR(255)` | `NOT NULL`                                                                                 | Email de contacto del negocio            |
| `phone`                | `VARCHAR(20)`  |                                                                                            | Teléfono del negocio                     |
| `address`              | `TEXT`         |                                                                                            | Dirección del negocio                    |
| `logo_url`             | `TEXT`         |                                                                                            | URL del logo en Supabase Storage         |
| `primary_color`        | `VARCHAR(7)`   | `DEFAULT '#1976D2'`                                                                        | Color primario del tema                  |
| `secondary_color`      | `VARCHAR(7)`   | `DEFAULT '#424242'`                                                                        | Color secundario del tema                |
| `plan_id`              | `VARCHAR(50)`  | `NOT NULL DEFAULT 'free'`                                                                  | Plan de suscripción                      |
| `status`               | `VARCHAR(20)`  | `NOT NULL DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'suspended', 'cancelled'))` | Estado del tenant                        |
| `modules`              | `JSONB`        | `NOT NULL DEFAULT '{"appointments": true, "digital_menu": false, "crm": false}'`           | Módulos activos                          |
| `trial_ends_at`        | `TIMESTAMPTZ`  |                                                                                            | Fecha de fin del período de prueba       |
| `subscription_ends_at` | `TIMESTAMPTZ`  |                                                                                            | Fecha de fin de suscripción              |
| `timezone`             | `VARCHAR(50)`  | `DEFAULT 'America/Mexico_City'`                                                            | Zona horaria del negocio                 |
| `locale`               | `VARCHAR(5)`   | `DEFAULT 'es'`                                                                             | Idioma por defecto                       |
| `config`               | `JSONB`        | `DEFAULT '{}'`                                                                             | Configuración adicional del negocio      |
| `created_at`           | `TIMESTAMPTZ`  | `NOT NULL DEFAULT now()`                                                                   | Fecha de creación                        |
| `updated_at`           | `TIMESTAMPTZ`  | `NOT NULL DEFAULT now()`                                                                   | Fecha de última modificación             |
| `deleted_at`           | `TIMESTAMPTZ`  |                                                                                            | Fecha de eliminación (soft delete)       |

**Índices**:

- `UNIQUE INDEX idx_tenants_slug ON tenants(slug) WHERE deleted_at IS NULL`
- `INDEX idx_tenants_status ON tenants(status)`
- `INDEX idx_tenants_plan_id ON tenants(plan_id)`

---

#### `users`

| Columna            | Tipo           | Restricciones                                                                               | Descripción                     |
| ------------------ | -------------- | ------------------------------------------------------------------------------------------- | ------------------------------- |
| `id`               | `UUID`         | `PK DEFAULT gen_random_uuid()`                                                              | Identificador único             |
| `tenant_id`        | `UUID`         | `FK -> tenants(id) NOT NULL`                                                                | Tenant al que pertenece         |
| `supabase_user_id` | `UUID`         | `UNIQUE NOT NULL`                                                                           | ID del usuario en Supabase Auth |
| `email`            | `VARCHAR(255)` | `NOT NULL`                                                                                  | Email del usuario               |
| `first_name`       | `VARCHAR(100)` | `NOT NULL`                                                                                  | Nombre                          |
| `last_name`        | `VARCHAR(100)` | `NOT NULL`                                                                                  | Apellidos                       |
| `phone`            | `VARCHAR(20)`  |                                                                                             | Teléfono                        |
| `avatar_url`       | `TEXT`         |                                                                                             | URL del avatar                  |
| `role`             | `VARCHAR(20)`  | `NOT NULL DEFAULT 'employee' CHECK (role IN ('super_admin', 'owner', 'admin', 'employee'))` | Rol en el sistema               |
| `is_active`        | `BOOLEAN`      | `NOT NULL DEFAULT true`                                                                     | Si el usuario está activo       |
| `last_login_at`    | `TIMESTAMPTZ`  |                                                                                             | Último inicio de sesión         |
| `created_at`       | `TIMESTAMPTZ`  | `NOT NULL DEFAULT now()`                                                                    |                                 |
| `updated_at`       | `TIMESTAMPTZ`  | `NOT NULL DEFAULT now()`                                                                    |                                 |
| `deleted_at`       | `TIMESTAMPTZ`  |                                                                                             |                                 |

**Índices**:

- `INDEX idx_users_tenant_id ON users(tenant_id)`
- `INDEX idx_users_email ON users(email)`
- `INDEX idx_users_role ON users(role)`
- `UNIQUE INDEX idx_users_supabase_id ON users(supabase_user_id)`
- `UNIQUE INDEX idx_users_tenant_email ON users(tenant_id, email) WHERE deleted_at IS NULL`

**Nota**: El `super_admin` tiene `tenant_id` = `NULL` (no pertenece a ningún negocio).

---

#### `audit_logs`

| Columna       | Tipo           | Restricciones                  | Descripción                                              |
| ------------- | -------------- | ------------------------------ | -------------------------------------------------------- |
| `id`          | `UUID`         | `PK DEFAULT gen_random_uuid()` |                                                          |
| `tenant_id`   | `UUID`         | `FK -> tenants(id)`            | Tenant (puede ser NULL para acciones de super admin)     |
| `user_id`     | `UUID`         | `FK -> users(id)`              | Usuario que realizó la acción                            |
| `action`      | `VARCHAR(100)` | `NOT NULL`                     | Acción realizada (ej: `booking.created`, `user.invited`) |
| `entity_type` | `VARCHAR(50)`  | `NOT NULL`                     | Tipo de entidad afectada (ej: `booking`, `user`)         |
| `entity_id`   | `UUID`         |                                | ID de la entidad afectada                                |
| `details`     | `JSONB`        | `DEFAULT '{}'`                 | Detalles adicionales de la acción                        |
| `ip_address`  | `INET`         |                                | Dirección IP del usuario                                 |
| `created_at`  | `TIMESTAMPTZ`  | `NOT NULL DEFAULT now()`       |                                                          |

**Índices**:

- `INDEX idx_audit_logs_tenant_id ON audit_logs(tenant_id)`
- `INDEX idx_audit_logs_user_id ON audit_logs(user_id)`
- `INDEX idx_audit_logs_created_at ON audit_logs(created_at)`
- `INDEX idx_audit_logs_action ON audit_logs(action)`

**RLS**: Solo super admin puede leer todos los logs. Los tenants solo ven sus propios logs.

---

### Tablas del Módulo de Citas

#### `services`

| Columna            | Tipo           | Restricciones                                                        | Descripción               |
| ------------------ | -------------- | -------------------------------------------------------------------- | ------------------------- |
| `id`               | `UUID`         | `PK DEFAULT gen_random_uuid()`                                       |                           |
| `tenant_id`        | `UUID`         | `FK -> tenants(id) NOT NULL`                                         |                           |
| `name`             | `VARCHAR(255)` | `NOT NULL`                                                           | Nombre del servicio       |
| `description`      | `TEXT`         |                                                                      | Descripción               |
| `duration_minutes` | `INTEGER`      | `NOT NULL CHECK (duration_minutes >= 5 AND duration_minutes <= 480)` | Duración en minutos       |
| `price`            | `INTEGER`      | `NOT NULL CHECK (price >= 0)`                                        | Precio en centavos        |
| `color`            | `VARCHAR(7)`   | `DEFAULT '#1976D2'`                                                  | Color para la agenda      |
| `category`         | `VARCHAR(100)` |                                                                      | Categoría del servicio    |
| `image_url`        | `TEXT`         |                                                                      | URL de imagen ilustrativa |
| `is_active`        | `BOOLEAN`      | `NOT NULL DEFAULT true`                                              |                           |
| `sort_order`       | `INTEGER`      | `DEFAULT 0`                                                          | Orden de visualización    |
| `created_at`       | `TIMESTAMPTZ`  | `NOT NULL DEFAULT now()`                                             |                           |
| `updated_at`       | `TIMESTAMPTZ`  | `NOT NULL DEFAULT now()`                                             |                           |
| `deleted_at`       | `TIMESTAMPTZ`  |                                                                      |                           |

**Índices**:

- `INDEX idx_services_tenant_id ON services(tenant_id)`
- `INDEX idx_services_active ON services(tenant_id, is_active) WHERE deleted_at IS NULL`

---

#### `employees`

| Columna      | Tipo           | Restricciones                  | Descripción                                                                 |
| ------------ | -------------- | ------------------------------ | --------------------------------------------------------------------------- |
| `id`         | `UUID`         | `PK DEFAULT gen_random_uuid()` |                                                                             |
| `tenant_id`  | `UUID`         | `FK -> tenants(id) NOT NULL`   |                                                                             |
| `user_id`    | `UUID`         | `FK -> users(id) UNIQUE`       | Relación con la tabla users (nullable para empleados sin cuenta de usuario) |
| `first_name` | `VARCHAR(100)` | `NOT NULL`                     |                                                                             |
| `last_name`  | `VARCHAR(100)` | `NOT NULL`                     |                                                                             |
| `email`      | `VARCHAR(255)` |                                | Email del empleado                                                          |
| `phone`      | `VARCHAR(20)`  |                                |                                                                             |
| `color`      | `VARCHAR(7)`   | `DEFAULT '#1976D2'`            | Color en la agenda                                                          |
| `is_active`  | `BOOLEAN`      | `NOT NULL DEFAULT true`        |                                                                             |
| `created_at` | `TIMESTAMPTZ`  | `NOT NULL DEFAULT now()`       |                                                                             |
| `updated_at` | `TIMESTAMPTZ`  | `NOT NULL DEFAULT now()`       |                                                                             |
| `deleted_at` | `TIMESTAMPTZ`  |                                |                                                                             |

**Índices**:

- `INDEX idx_employees_tenant_id ON employees(tenant_id)`
- `INDEX idx_employees_active ON employees(tenant_id, is_active) WHERE deleted_at IS NULL`

---

#### `employee_services`

| Columna       | Tipo          | Restricciones                                    | Descripción |
| ------------- | ------------- | ------------------------------------------------ | ----------- |
| `id`          | `UUID`        | `PK DEFAULT gen_random_uuid()`                   |             |
| `employee_id` | `UUID`        | `FK -> employees(id) NOT NULL ON DELETE CASCADE` |             |
| `service_id`  | `UUID`        | `FK -> services(id) NOT NULL ON DELETE CASCADE`  |             |
| `created_at`  | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()`                         |             |

**Índices**:

- `UNIQUE INDEX idx_employee_services_unique ON employee_services(employee_id, service_id)`
- `INDEX idx_employee_services_service ON employee_services(service_id)`

---

#### `schedules`

| Columna       | Tipo          | Restricciones                                  | Descripción                        |
| ------------- | ------------- | ---------------------------------------------- | ---------------------------------- |
| `id`          | `UUID`        | `PK DEFAULT gen_random_uuid()`                 |                                    |
| `tenant_id`   | `UUID`        | `FK -> tenants(id) NOT NULL`                   |                                    |
| `employee_id` | `UUID`        | `FK -> employees(id) ON DELETE CASCADE`        | NULL = horario general del negocio |
| `day_of_week` | `SMALLINT`    | `NOT NULL CHECK (day_of_week BETWEEN 0 AND 6)` | 0=Domingo, 1=Lunes...              |
| `start_time`  | `TIME`        | `NOT NULL`                                     | Hora de inicio                     |
| `end_time`    | `TIME`        | `NOT NULL CHECK (end_time > start_time)`       | Hora de fin                        |
| `is_active`   | `BOOLEAN`     | `NOT NULL DEFAULT true`                        |                                    |
| `created_at`  | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()`                       |                                    |
| `updated_at`  | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()`                       |                                    |

**Índices**:

- `INDEX idx_schedules_tenant_employee ON schedules(tenant_id, employee_id)`
- `INDEX idx_schedules_day ON schedules(day_of_week)`

---

#### `schedule_breaks`

| Columna       | Tipo          | Restricciones                                    | Descripción         |
| ------------- | ------------- | ------------------------------------------------ | ------------------- |
| `id`          | `UUID`        | `PK DEFAULT gen_random_uuid()`                   |                     |
| `schedule_id` | `UUID`        | `FK -> schedules(id) NOT NULL ON DELETE CASCADE` |                     |
| `start_time`  | `TIME`        | `NOT NULL`                                       | Inicio del descanso |
| `end_time`    | `TIME`        | `NOT NULL CHECK (end_time > start_time)`         | Fin del descanso    |
| `created_at`  | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()`                         |                     |

**Índices**:

- `INDEX idx_schedule_breaks_schedule ON schedule_breaks(schedule_id)`

---

#### `holiday_exceptions`

| Columna      | Tipo           | Restricciones                  | Descripción                |
| ------------ | -------------- | ------------------------------ | -------------------------- |
| `id`         | `UUID`         | `PK DEFAULT gen_random_uuid()` |                            |
| `tenant_id`  | `UUID`         | `FK -> tenants(id) NOT NULL`   |                            |
| `date`       | `DATE`         | `NOT NULL`                     | Fecha de excepción         |
| `is_closed`  | `BOOLEAN`      | `NOT NULL DEFAULT true`        | true = cerrado todo el día |
| `start_time` | `TIME`         |                                | Si cierra solo medio día   |
| `end_time`   | `TIME`         |                                | Si cierra solo medio día   |
| `reason`     | `VARCHAR(255)` |                                | Motivo (opcional)          |
| `created_at` | `TIMESTAMPTZ`  | `NOT NULL DEFAULT now()`       |                            |

**Índices**:

- `UNIQUE INDEX idx_holiday_exceptions_date ON holiday_exceptions(tenant_id, date)`
- `INDEX idx_holiday_exceptions_tenant ON holiday_exceptions(tenant_id)`

---

#### `bookings`

| Columna               | Tipo           | Restricciones                                                                                                      | Descripción                                             |
| --------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- |
| `id`                  | `UUID`         | `PK DEFAULT gen_random_uuid()`                                                                                     |                                                         |
| `tenant_id`           | `UUID`         | `FK -> tenants(id) NOT NULL`                                                                                       |                                                         |
| `customer_id`         | `UUID`         | `FK -> customers(id)`                                                                                              | Cliente que reserva (nullable para reservas sin cuenta) |
| `service_id`          | `UUID`         | `FK -> services(id) NOT NULL`                                                                                      |                                                         |
| `employee_id`         | `UUID`         | `FK -> employees(id) NOT NULL`                                                                                     |                                                         |
| `date`                | `DATE`         | `NOT NULL`                                                                                                         | Fecha de la cita                                        |
| `start_time`          | `TIME`         | `NOT NULL`                                                                                                         | Hora de inicio                                          |
| `end_time`            | `TIME`         | `NOT NULL`                                                                                                         | Hora de fin (start_time + duración del servicio)        |
| `status`              | `VARCHAR(20)`  | `NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'in_progress', 'completed', 'no_show', 'cancelled'))` | Estado                                                  |
| `cancellation_reason` | `TEXT`         |                                                                                                                    | Motivo de cancelación                                   |
| `cancelled_by`        | `VARCHAR(20)`  | `CHECK (cancelled_by IN ('customer', 'employee', 'system'))`                                                       | Quién canceló                                           |
| `cancelled_at`        | `TIMESTAMPTZ`  |                                                                                                                    | Cuándo se canceló                                       |
| `customer_name`       | `VARCHAR(200)` |                                                                                                                    | Nombre del cliente (para reservas sin cuenta)           |
| `customer_email`      | `VARCHAR(255)` |                                                                                                                    | Email del cliente                                       |
| `customer_phone`      | `VARCHAR(20)`  |                                                                                                                    | Teléfono del cliente                                    |
| `notes`               | `TEXT`         |                                                                                                                    | Notas de la cita                                        |
| `source`              | `VARCHAR(20)`  | `DEFAULT 'online' CHECK (source IN ('online', 'manual', 'phone'))`                                                 | Origen de la reserva                                    |
| `created_at`          | `TIMESTAMPTZ`  | `NOT NULL DEFAULT now()`                                                                                           |                                                         |
| `updated_at`          | `TIMESTAMPTZ`  | `NOT NULL DEFAULT now()`                                                                                           |                                                         |
| `deleted_at`          | `TIMESTAMPTZ`  |                                                                                                                    |                                                         |

**Índices**:

- `INDEX idx_bookings_tenant_date ON bookings(tenant_id, date)`
- `INDEX idx_bookings_employee_date ON bookings(employee_id, date)`
- `INDEX idx_bookings_customer ON bookings(customer_id)`
- `INDEX idx_bookings_status ON bookings(status)`
- `INDEX idx_bookings_date_range ON bookings(tenant_id, date, start_time, end_time)`
- `INDEX idx_bookings_created_at ON bookings(tenant_id, created_at)`

**Constraints**:

- `CHECK (end_time > start_time)`
- `CHECK (date >= CURRENT_DATE)` — No se pueden crear citas en el pasado
- `CHECK (cancelled_at IS NULL OR (cancelled_at IS NOT NULL AND cancellation_reason IS NOT NULL))` — Si se cancela, debe tener motivo

---

### Tablas del Módulo de Carta Digital

#### `categories`

| Columna       | Tipo           | Restricciones                       | Descripción                                     |
| ------------- | -------------- | ----------------------------------- | ----------------------------------------------- |
| `id`          | `UUID`         | `PK DEFAULT gen_random_uuid()`      |                                                 |
| `tenant_id`   | `UUID`         | `FK -> tenants(id) NOT NULL`        |                                                 |
| `menu_id`     | `UUID`         | `FK -> menus(id) ON DELETE CASCADE` | Menú al que pertenece (NULL = menú por defecto) |
| `name`        | `VARCHAR(255)` | `NOT NULL`                          | Nombre de la categoría                          |
| `description` | `TEXT`         |                                     | Descripción                                     |
| `icon`        | `VARCHAR(50)`  |                                     | Icono (Material Design Icons)                   |
| `sort_order`  | `INTEGER`      | `NOT NULL DEFAULT 0`                | Orden de visualización                          |
| `is_active`   | `BOOLEAN`      | `NOT NULL DEFAULT true`             |                                                 |
| `created_at`  | `TIMESTAMPTZ`  | `NOT NULL DEFAULT now()`            |                                                 |
| `updated_at`  | `TIMESTAMPTZ`  | `NOT NULL DEFAULT now()`            |                                                 |
| `deleted_at`  | `TIMESTAMPTZ`  |                                     |                                                 |

**Índices**:

- `INDEX idx_categories_tenant ON categories(tenant_id)`
- `INDEX idx_categories_menu ON categories(menu_id)`

---

#### `menus`

| Columna        | Tipo           | Restricciones                  | Descripción                     |
| -------------- | -------------- | ------------------------------ | ------------------------------- |
| `id`           | `UUID`         | `PK DEFAULT gen_random_uuid()` |                                 |
| `tenant_id`    | `UUID`         | `FK -> tenants(id) NOT NULL`   |                                 |
| `name`         | `VARCHAR(255)` | `NOT NULL`                     | Nombre del menú                 |
| `description`  | `TEXT`         |                                |                                 |
| `is_default`   | `BOOLEAN`      | `NOT NULL DEFAULT false`       | Menú por defecto                |
| `start_time`   | `TIME`         |                                | Hora de inicio de vigencia      |
| `end_time`     | `TIME`         |                                | Hora de fin de vigencia         |
| `days_of_week` | `SMALLINT[]`   | `DEFAULT '{}'`                 | Días de la semana en que aplica |
| `is_active`    | `BOOLEAN`      | `NOT NULL DEFAULT true`        |                                 |
| `created_at`   | `TIMESTAMPTZ`  | `NOT NULL DEFAULT now()`       |                                 |
| `updated_at`   | `TIMESTAMPTZ`  | `NOT NULL DEFAULT now()`       |                                 |
| `deleted_at`   | `TIMESTAMPTZ`  |                                |                                 |

**Índices**:

- `INDEX idx_menus_tenant ON menus(tenant_id)`

---

#### `products`

| Columna        | Tipo           | Restricciones                   | Descripción             |
| -------------- | -------------- | ------------------------------- | ----------------------- |
| `id`           | `UUID`         | `PK DEFAULT gen_random_uuid()`  |                         |
| `tenant_id`    | `UUID`         | `FK -> tenants(id) NOT NULL`    |                         |
| `category_id`  | `UUID`         | `FK -> categories(id) NOT NULL` |                         |
| `name`         | `VARCHAR(255)` | `NOT NULL`                      |                         |
| `description`  | `TEXT`         |                                 |                         |
| `price`        | `INTEGER`      | `NOT NULL CHECK (price >= 0)`   | Precio base en centavos |
| `images`       | `TEXT[]`       | `DEFAULT '{}'`                  | URLs de imágenes        |
| `is_available` | `BOOLEAN`      | `NOT NULL DEFAULT true`         | Disponible para pedido  |
| `is_featured`  | `BOOLEAN`      | `NOT NULL DEFAULT false`        | Destacado               |
| `has_variants` | `BOOLEAN`      | `NOT NULL DEFAULT false`        | Tiene variantes         |
| `has_extras`   | `BOOLEAN`      | `NOT NULL DEFAULT false`        | Tiene extras            |
| `sort_order`   | `INTEGER`      | `NOT NULL DEFAULT 0`            |                         |
| `created_at`   | `TIMESTAMPTZ`  | `NOT NULL DEFAULT now()`        |                         |
| `updated_at`   | `TIMESTAMPTZ`  | `NOT NULL DEFAULT now()`        |                         |
| `deleted_at`   | `TIMESTAMPTZ`  |                                 |                         |

**Índices**:

- `INDEX idx_products_tenant_category ON products(tenant_id, category_id)`
- `INDEX idx_products_available ON products(tenant_id, is_available) WHERE deleted_at IS NULL`

---

#### `product_variants`

| Columna      | Tipo           | Restricciones                                   | Descripción                                  |
| ------------ | -------------- | ----------------------------------------------- | -------------------------------------------- |
| `id`         | `UUID`         | `PK DEFAULT gen_random_uuid()`                  |                                              |
| `product_id` | `UUID`         | `FK -> products(id) NOT NULL ON DELETE CASCADE` |                                              |
| `name`       | `VARCHAR(255)` | `NOT NULL`                                      | Nombre de la variante                        |
| `price`      | `INTEGER`      |                                                 | Precio adicional (NULL = usa el precio base) |
| `sort_order` | `INTEGER`      | `DEFAULT 0`                                     |                                              |
| `created_at` | `TIMESTAMPTZ`  | `NOT NULL DEFAULT now()`                        |                                              |

**Índices**:

- `INDEX idx_product_variants_product ON product_variants(product_id)`

---

#### `extra_groups`

| Columna          | Tipo           | Restricciones                                   | Descripción                                 |
| ---------------- | -------------- | ----------------------------------------------- | ------------------------------------------- |
| `id`             | `UUID`         | `PK DEFAULT gen_random_uuid()`                  |                                             |
| `product_id`     | `UUID`         | `FK -> products(id) NOT NULL ON DELETE CASCADE` |                                             |
| `name`           | `VARCHAR(255)` | `NOT NULL`                                      | Nombre del grupo (ej: "Ingredientes extra") |
| `max_selectable` | `SMALLINT`     | `DEFAULT 0`                                     | 0 = sin límite                              |
| `is_multiple`    | `BOOLEAN`      | `NOT NULL DEFAULT true`                         | Selección múltiple o única                  |
| `sort_order`     | `INTEGER`      | `DEFAULT 0`                                     |                                             |
| `created_at`     | `TIMESTAMPTZ`  | `NOT NULL DEFAULT now()`                        |                                             |

**Índices**:

- `INDEX idx_extra_groups_product ON extra_groups(product_id)`

---

#### `extras`

| Columna      | Tipo           | Restricciones                                       | Descripción              |
| ------------ | -------------- | --------------------------------------------------- | ------------------------ |
| `id`         | `UUID`         | `PK DEFAULT gen_random_uuid()`                      |                          |
| `group_id`   | `UUID`         | `FK -> extra_groups(id) NOT NULL ON DELETE CASCADE` |                          |
| `name`       | `VARCHAR(255)` | `NOT NULL`                                          |                          |
| `price`      | `INTEGER`      | `NOT NULL DEFAULT 0 CHECK (price >= 0)`             | Precio adicional         |
| `is_default` | `BOOLEAN`      | `NOT NULL DEFAULT false`                            | Seleccionado por defecto |
| `sort_order` | `INTEGER`      | `DEFAULT 0`                                         |                          |
| `created_at` | `TIMESTAMPTZ`  | `NOT NULL DEFAULT now()`                            |                          |

**Índices**:

- `INDEX idx_extras_group ON extras(group_id)`

---

#### `tables`

| Columna       | Tipo           | Restricciones                  | Descripción                          |
| ------------- | -------------- | ------------------------------ | ------------------------------------ |
| `id`          | `UUID`         | `PK DEFAULT gen_random_uuid()` |                                      |
| `tenant_id`   | `UUID`         | `FK -> tenants(id) NOT NULL`   |                                      |
| `number`      | `VARCHAR(10)`  | `NOT NULL`                     | Número o nombre de la mesa           |
| `capacity`    | `SMALLINT`     | `DEFAULT 4`                    | Capacidad de personas                |
| `location`    | `VARCHAR(100)` |                                | Ubicación (interior, terraza, barra) |
| `qr_code_url` | `TEXT`         |                                | URL del QR generado                  |
| `is_active`   | `BOOLEAN`      | `NOT NULL DEFAULT true`        |                                      |
| `created_at`  | `TIMESTAMPTZ`  | `NOT NULL DEFAULT now()`       |                                      |
| `updated_at`  | `TIMESTAMPTZ`  | `NOT NULL DEFAULT now()`       |                                      |
| `deleted_at`  | `TIMESTAMPTZ`  |                                |                                      |

**Índices**:

- `UNIQUE INDEX idx_tables_number ON tables(tenant_id, number) WHERE deleted_at IS NULL`
- `INDEX idx_tables_tenant ON tables(tenant_id)`

---

#### `orders`

| Columna          | Tipo           | Restricciones                                                                                              | Descripción                                       |
| ---------------- | -------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `id`             | `UUID`         | `PK DEFAULT gen_random_uuid()`                                                                             |                                                   |
| `tenant_id`      | `UUID`         | `FK -> tenants(id) NOT NULL`                                                                               |                                                   |
| `table_id`       | `UUID`         | `FK -> tables(id)`                                                                                         | Mesa asociada (nullable para pedidos para llevar) |
| `customer_id`    | `UUID`         | `FK -> customers(id)`                                                                                      | Cliente (nullable para pedidos sin cuenta)        |
| `customer_name`  | `VARCHAR(200)` |                                                                                                            | Nombre del cliente                                |
| `customer_email` | `VARCHAR(255)` |                                                                                                            |                                                   |
| `customer_phone` | `VARCHAR(20)`  |                                                                                                            |                                                   |
| `status`         | `VARCHAR(20)`  | `NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'delivered', 'cancelled'))` | Estado del pedido                                 |
| `notes`          | `TEXT`         |                                                                                                            | Notas generales del pedido                        |
| `total_amount`   | `INTEGER`      | `NOT NULL CHECK (total_amount >= 0)`                                                                       | Total en centavos                                 |
| `created_at`     | `TIMESTAMPTZ`  | `NOT NULL DEFAULT now()`                                                                                   |                                                   |
| `updated_at`     | `TIMESTAMPTZ`  | `NOT NULL DEFAULT now()`                                                                                   |                                                   |

**Índices**:

- `INDEX idx_orders_tenant_status ON orders(tenant_id, status)`
- `INDEX idx_orders_table ON orders(table_id)`
- `INDEX idx_orders_created_at ON orders(tenant_id, created_at DESC)`

---

#### `order_items`

| Columna        | Tipo           | Restricciones                                 | Descripción                               |
| -------------- | -------------- | --------------------------------------------- | ----------------------------------------- |
| `id`           | `UUID`         | `PK DEFAULT gen_random_uuid()`                |                                           |
| `order_id`     | `UUID`         | `FK -> orders(id) NOT NULL ON DELETE CASCADE` |                                           |
| `product_id`   | `UUID`         | `FK -> products(id)`                          |                                           |
| `product_name` | `VARCHAR(255)` | `NOT NULL`                                    | Snapshot del nombre al momento del pedido |
| `variant_name` | `VARCHAR(255)` |                                               | Variante seleccionada                     |
| `extras`       | `JSONB`        | `DEFAULT '[]'`                                | Extras seleccionados [{name, price}]      |
| `quantity`     | `SMALLINT`     | `NOT NULL CHECK (quantity > 0)`               |                                           |
| `unit_price`   | `INTEGER`      | `NOT NULL CHECK (unit_price >= 0)`            | Precio unitario en centavos               |
| `subtotal`     | `INTEGER`      | `NOT NULL CHECK (subtotal >= 0)`              | unit_price * quantity                     |
| `notes`        | `TEXT`         |                                               | Notas del item                            |
| `created_at`   | `TIMESTAMPTZ`  | `NOT NULL DEFAULT now()`                      |                                           |

**Índices**:

- `INDEX idx_order_items_order ON order_items(order_id)`

---

### Tablas del Módulo de CRM

#### `customers`

| Columna            | Tipo           | Restricciones                  | Descripción                           |
| ------------------ | -------------- | ------------------------------ | ------------------------------------- |
| `id`               | `UUID`         | `PK DEFAULT gen_random_uuid()` |                                       |
| `tenant_id`        | `UUID`         | `FK -> tenants(id) NOT NULL`   |                                       |
| `supabase_user_id` | `UUID`         |                                | ID en Supabase Auth (si tiene cuenta) |
| `first_name`       | `VARCHAR(100)` | `NOT NULL`                     |                                       |
| `last_name`        | `VARCHAR(100)` | `NOT NULL`                     |                                       |
| `email`            | `VARCHAR(255)` |                                |                                       |
| `phone`            | `VARCHAR(20)`  |                                |                                       |
| `notes`            | `TEXT`         |                                | Nota general                          |
| `total_visits`     | `INTEGER`      | `NOT NULL DEFAULT 0`           | Contador de visitas                   |
| `total_spent`      | `INTEGER`      | `NOT NULL DEFAULT 0`           | Total gastado en centavos             |
| `last_visit_at`    | `TIMESTAMPTZ`  |                                | Fecha de la última visita             |
| `created_at`       | `TIMESTAMPTZ`  | `NOT NULL DEFAULT now()`       |                                       |
| `updated_at`       | `TIMESTAMPTZ`  | `NOT NULL DEFAULT now()`       |                                       |
| `deleted_at`       | `TIMESTAMPTZ`  |                                |                                       |

**Índices**:

- `UNIQUE INDEX idx_customers_tenant_email ON customers(tenant_id, email) WHERE email IS NOT NULL AND deleted_at IS NULL`
- `INDEX idx_customers_name_search ON customers USING gin(to_tsvector('simple', first_name || ' ' || last_name))`
- `INDEX idx_customers_tenant ON customers(tenant_id)`
- `INDEX idx_customers_created_at ON customers(tenant_id, created_at DESC)`
- `INDEX idx_customers_total_visits ON customers(tenant_id, total_visits DESC)`

---

#### `customer_notes`

| Columna       | Tipo          | Restricciones                                    | Descripción              |
| ------------- | ------------- | ------------------------------------------------ | ------------------------ |
| `id`          | `UUID`        | `PK DEFAULT gen_random_uuid()`                   |                          |
| `customer_id` | `UUID`        | `FK -> customers(id) NOT NULL ON DELETE CASCADE` |                          |
| `tenant_id`   | `UUID`        | `FK -> tenants(id) NOT NULL`                     |                          |
| `author_id`   | `UUID`        | `FK -> users(id) NOT NULL`                       | Usuario que creó la nota |
| `content`     | `TEXT`        | `NOT NULL`                                       | Contenido de la nota     |
| `created_at`  | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()`                         |                          |
| `updated_at`  | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()`                         |                          |

**Índices**:

- `INDEX idx_customer_notes_customer ON customer_notes(customer_id)`
- `INDEX idx_customer_notes_tenant ON customer_notes(tenant_id)`

---

#### `tags`

| Columna      | Tipo          | Restricciones                  | Descripción           |
| ------------ | ------------- | ------------------------------ | --------------------- |
| `id`         | `UUID`        | `PK DEFAULT gen_random_uuid()` |                       |
| `tenant_id`  | `UUID`        | `FK -> tenants(id) NOT NULL`   |                       |
| `name`       | `VARCHAR(50)` | `NOT NULL`                     | Nombre de la etiqueta |
| `color`      | `VARCHAR(7)`  | `DEFAULT '#1976D2'`            | Color de la etiqueta  |
| `is_system`  | `BOOLEAN`     | `NOT NULL DEFAULT false`       | Creada por el sistema |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()`       |                       |

**Índices**:

- `UNIQUE INDEX idx_tags_name ON tags(tenant_id, name)`
- `INDEX idx_tags_tenant ON tags(tenant_id)`

---

#### `customer_tags`

| Columna       | Tipo          | Restricciones                                    | Descripción |
| ------------- | ------------- | ------------------------------------------------ | ----------- |
| `customer_id` | `UUID`        | `FK -> customers(id) NOT NULL ON DELETE CASCADE` |             |
| `tag_id`      | `UUID`        | `FK -> tags(id) NOT NULL ON DELETE CASCADE`      |             |
| `created_at`  | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()`                         |             |

**PK**: `PRIMARY KEY (customer_id, tag_id)`

---

#### `loyalty_points`

| Columna          | Tipo          | Restricciones                                                                                    | Descripción                                         |
| ---------------- | ------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------- |
| `id`             | `UUID`        | `PK DEFAULT gen_random_uuid()`                                                                   |                                                     |
| `tenant_id`      | `UUID`        | `FK -> tenants(id) NOT NULL`                                                                     |                                                     |
| `customer_id`    | `UUID`        | `FK -> customers(id) NOT NULL`                                                                   |                                                     |
| `points`         | `INTEGER`     | `NOT NULL`                                                                                       | Puntos (positivos = ganados, negativos = canjeados) |
| `reason`         | `VARCHAR(50)` | `NOT NULL CHECK (reason IN ('visit', 'purchase', 'welcome', 'redeem', 'expired', 'adjustment'))` | Motivo                                              |
| `reference_type` | `VARCHAR(20)` |                                                                                                  | Tipo de referencia (booking, order)                 |
| `reference_id`   | `UUID`        |                                                                                                  | ID de la referencia                                 |
| `expires_at`     | `TIMESTAMPTZ` |                                                                                                  | Fecha de expiración                                 |
| `created_at`     | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()`                                                                         |                                                     |

**Índices**:

- `INDEX idx_loyalty_points_customer ON loyalty_points(customer_id)`
- `INDEX idx_loyalty_points_tenant ON loyalty_points(tenant_id)`
- `INDEX idx_loyalty_points_expires ON loyalty_points(expires_at) WHERE points > 0`

---

#### `loyalty_config`

| Columna               | Tipo          | Restricciones                       | Descripción                                                  |
| --------------------- | ------------- | ----------------------------------- | ------------------------------------------------------------ |
| `id`                  | `UUID`        | `PK DEFAULT gen_random_uuid()`      |                                                              |
| `tenant_id`           | `UUID`        | `FK -> tenants(id) NOT NULL UNIQUE` |                                                              |
| `points_per_visit`    | `INTEGER`     | `NOT NULL DEFAULT 10`               | Puntos por visita                                            |
| `points_per_currency` | `INTEGER`     | `NOT NULL DEFAULT 1`                | Puntos por cada unidad de moneda (ej: 1 punto por cada $100) |
| `currency_unit`       | `INTEGER`     | `NOT NULL DEFAULT 10000`            | Unidad de moneda en centavos (10000 = $100)                  |
| `points_to_currency`  | `INTEGER`     | `NOT NULL DEFAULT 100`              | Cuántos puntos equivalen a la unidad de descuento            |
| `redemption_unit`     | `INTEGER`     | `NOT NULL DEFAULT 5000`             | Unidad de descuento en centavos (5000 = $50)                 |
| `welcome_points`      | `INTEGER`     | `NOT NULL DEFAULT 50`               | Puntos de bienvenida                                         |
| `expiry_months`       | `INTEGER`     | `NOT NULL DEFAULT 6`                | Meses hasta expiración                                       |
| `is_active`           | `BOOLEAN`     | `NOT NULL DEFAULT false`            |                                                              |
| `created_at`          | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()`            |                                                              |
| `updated_at`          | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()`            |                                                              |

---

## Políticas RLS

### Principios Generales

1. **Toda tabla tiene RLS habilitado** (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`).
2. **Política por defecto**: `FOR ALL USING (false)` — denegado por defecto.
3. **Cada política verifica**: `tenant_id = auth.jwt() ->> 'tenant_id'`.
4. **Usuarios `super_admin`** tienen policy que permite acceso a todas las filas (verificando rol en JWT).
5. **Público**: Tablas de consulta pública (productos, categorías de un menú) tienen policies `USING (true)` solo para SELECT en endpoints públicos.

### Ejemplos de Policies

#### `bookings` — Política de SELECT para empleados

```sql
CREATE POLICY "employees_select_own_tenant_bookings"
ON bookings
FOR SELECT
TO authenticated
USING (
  tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  AND (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
    OR
    (auth.jwt() ->> 'role') IN ('admin', 'owner', 'super_admin')
  )
);
```

#### `bookings` — Política de INSERT (cliente público)

```sql
CREATE POLICY "public_insert_booking"
ON bookings
FOR INSERT
TO anon, authenticated
WITH CHECK (
  tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  -- Verificar que el slot está disponible (usando función de validación)
  AND is_slot_available(tenant_id, employee_id, date, start_time, end_time)
);
```

#### `products` — Política de SELECT público

```sql
CREATE POLICY "public_select_products"
ON products
FOR SELECT
TO anon
USING (
  tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  AND is_available = true
  AND deleted_at IS NULL
);
```

---

## Funciones SQL

### `get_available_slots`

```sql
CREATE OR REPLACE FUNCTION get_available_slots(
  p_tenant_id UUID,
  p_employee_id UUID,
  p_date DATE,
  p_service_duration INT
)
RETURNS TABLE (start_time TIME, end_time TIME)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH employee_schedule AS (
    SELECT s.start_time, s.end_time
    FROM schedules s
    WHERE s.tenant_id = p_tenant_id
      AND (s.employee_id = p_employee_id OR s.employee_id IS NULL)
      AND s.day_of_week = EXTRACT(DOW FROM p_date)
      AND s.is_active = true
    ORDER BY s.employee_id NULLS LAST
    LIMIT 1
  ),
  existing_bookings AS (
    SELECT start_time, end_time
    FROM bookings
    WHERE tenant_id = p_tenant_id
      AND employee_id = p_employee_id
      AND date = p_date
      AND status NOT IN ('cancelled')
      AND deleted_at IS NULL
  ),
  breaks AS (
    SELECT sb.start_time, sb.end_time
    FROM schedule_breaks sb
    JOIN schedules s ON sb.schedule_id = s.id
    WHERE s.tenant_id = p_tenant_id
      AND (s.employee_id = p_employee_id OR s.employee_id IS NULL)
      AND s.day_of_week = EXTRACT(DOW FROM p_date)
  ),
  holiday AS (
    SELECT 1
    FROM holiday_exceptions
    WHERE tenant_id = p_tenant_id
      AND date = p_date
      AND is_closed = true
  )
  -- Generar slots cada 30 minutos dentro del horario laboral
  -- excluyendo bookings existentes y descansos
  SELECT generate_series(
    (SELECT start_time FROM employee_schedule),
    (SELECT end_time FROM employee_schedule) - (p_service_duration || ' minutes')::INTERVAL,
    '30 minutes'::INTERVAL
  )::TIME AS slot_start,
  (generate_series(...) + (p_service_duration || ' minutes')::INTERVAL)::TIME AS slot_end
  WHERE NOT EXISTS (SELECT 1 FROM holiday)
  AND NOT EXISTS (
    SELECT 1 FROM existing_bookings eb
    WHERE slot_start < eb.end_time AND slot_end > eb.start_time
  )
  AND NOT EXISTS (
    SELECT 1 FROM breaks b
    WHERE slot_start < b.end_time AND slot_end > b.start_time
  );
END;
$$;
```

### `update_customer_visit_stats`

```sql
CREATE OR REPLACE FUNCTION update_customer_visit_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'completed' THEN
    UPDATE customers
    SET
      total_visits = total_visits + 1,
      total_spent = total_spent + COALESCE(
        (SELECT SUM(total_amount) FROM orders WHERE customer_id = NEW.customer_id AND status = 'delivered'),
        0
      ),
      last_visit_at = NOW(),
      updated_at = NOW()
    WHERE id = NEW.customer_id
      AND tenant_id = NEW.tenant_id;
  END IF;
  RETURN NEW;
END;
$$;
```

---

## Triggers

| Trigger                     | Tabla      | Evento                 | Función                       | Propósito                                |
| --------------------------- | ---------- | ---------------------- | ----------------------------- | ---------------------------------------- |
| `trg_booking_audit`         | `bookings` | AFTER INSERT OR UPDATE | `log_audit_entry`             | Registrar cambios en citas               |
| `trg_customer_visit`        | `bookings` | AFTER UPDATE OF status | `update_customer_visit_stats` | Actualizar estadísticas del cliente      |
| `trg_order_audit`           | `orders`   | AFTER INSERT OR UPDATE | `log_audit_entry`             | Registrar cambios en pedidos             |
| `trg_update_updated_at`     | Todas      | BEFORE UPDATE          | `set_updated_at`              | Actualizar `updated_at` automáticamente  |
| `trg_customer_from_booking` | `bookings` | AFTER INSERT           | `create_or_update_customer`   | Crear/actualizar cliente automáticamente |

---

## Tipos Personalizados (ENUMs)

```sql
-- No usamos ENUMs de PostgreSQL para los status.
-- Usamos VARCHAR con CHECK constraint.
-- Motivo: flexibilidad para añadir nuevos estados sin migration.
-- Si la tabla es muy grande, considerar ENUM por rendimiento.
```

---

## Vistas

### `v_customer_summary`

```sql
CREATE VIEW v_customer_summary AS
SELECT
  c.id,
  c.tenant_id,
  c.first_name,
  c.last_name,
  c.email,
  c.phone,
  c.total_visits,
  c.total_spent,
  c.last_visit_at,
  c.created_at,
  COUNT(DISTINCT b.id) AS total_bookings,
  COUNT(DISTINCT o.id) AS total_orders,
  COALESCE(SUM(lp.points) FILTER (WHERE lp.points > 0), 0) AS total_points_earned,
  COALESCE(SUM(lp.points) FILTER (WHERE lp.points < 0), 0) AS total_points_redeemed,
  COALESCE((SELECT json_agg(t.*) FROM tags t
    JOIN customer_tags ct ON ct.tag_id = t.id
    WHERE ct.customer_id = c.id), '[]'::json) AS tags
FROM customers c
LEFT JOIN bookings b ON b.customer_id = c.id AND b.deleted_at IS NULL
LEFT JOIN orders o ON o.customer_id = c.id
LEFT JOIN loyalty_points lp ON lp.customer_id = c.id
GROUP BY c.id;
```

---

## Migraciones (Orden de Creación)

| #   | Archivo                                  | Contenido                                                       |
| --- | ---------------------------------------- | --------------------------------------------------------------- |
| 1   | `20260101000001_create_tenants.sql`      | Tabla `tenants`, índices                                        |
| 2   | `20260101000002_create_users.sql`        | Tabla `users`, índices                                          |
| 3   | `20260101000003_create_audit_logs.sql`   | Tabla `audit_logs`, índices                                     |
| 4   | `20260101000004_create_functions.sql`    | Funciones base: `set_updated_at`, `log_audit_entry`             |
| 5   | `20260101000005_create_services.sql`     | Tabla `services`                                                |
| 6   | `20260101000006_create_employees.sql`    | Tablas `employees`, `employee_services`                         |
| 7   | `20260101000007_create_schedules.sql`    | Tablas `schedules`, `schedule_breaks`, `holiday_exceptions`     |
| 8   | `20260101000008_create_bookings.sql`     | Tabla `bookings`, índices, función `get_available_slots`        |
| 9   | `20260101000009_create_menus.sql`        | Tabla `menus`                                                   |
| 10  | `20260101000010_create_categories.sql`   | Tabla `categories`                                              |
| 11  | `20260101000011_create_products.sql`     | Tablas `products`, `product_variants`, `extra_groups`, `extras` |
| 12  | `20260101000012_create_tables.sql`       | Tabla `tables`                                                  |
| 13  | `20260101000013_create_orders.sql`       | Tablas `orders`, `order_items`                                  |
| 14  | `20260101000014_create_customers.sql`    | Tablas `customers`, `customer_notes`                            |
| 15  | `20260101000015_create_tags.sql`         | Tablas `tags`, `customer_tags`                                  |
| 16  | `20260101000016_create_loyalty.sql`      | Tablas `loyalty_points`, `loyalty_config`                       |
| 17  | `20260101000017_create_views.sql`        | Vista `v_customer_summary`                                      |
| 18  | `20260101000018_enable_rls.sql`          | Habilitar RLS en todas las tablas                               |
| 19  | `20260101000019_create_rls_policies.sql` | Todas las policies RLS                                          |
| 20  | `20260101000020_create_triggers.sql`     | Todos los triggers                                              |

---

## Decisiones Tomadas

| Decisión                                              | Opción                           | Alternativas             | Justificación                                                                              |
| ----------------------------------------------------- | -------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------ |
| Precios en centavos (INTEGER)                         | `1000` = $10.00                  | DECIMAL, FLOAT           | Evita errores de redondeo. Estándar en sistemas financieros.                               |
| Soft delete con `deleted_at`                          | Columna nullable                 | Hard delete, is_active   | Permite recuperación de datos. Consultas siempre filtran `WHERE deleted_at IS NULL`.       |
| VARCHAR con CHECK en lugar de ENUM                    | `status VARCHAR(20) CHECK (...)` | ENUM de PostgreSQL       | Los ENUMs requieren migration para añadir valores. VARCHAR + CHECK es más flexible.        |
| JSONB para datos flexibles                            | `config`, `modules`, `details`   | Columnas individuales    | Para datos cuya estructura puede variar sin schema rígido.                                 |
| UUID como PK                                          | `gen_random_uuid()`              | Serial, ULID             | No secuencial (seguridad), único globalmente, soporte nativo en PostgreSQL.                |
| Snapshot de nombre en `order_items`                   | `product_name`, `variant_name`   | Solo FK a products       | Si el producto se modifica o elimina, el pedido histórico conserva los datos reales.       |
| `total_visits` y `total_spent` como columna calculada | Columna física + trigger         | Cálculo en cada consulta | Rendimiento: actualizar en cada visita es más rápido que sumar histórico en cada consulta. |

---

## Posibles Mejoras Futuras

- **Particionamiento** de tablas grandes (bookings, orders, audit_logs) por rango de fechas.
- **Vistas materializadas** para reportes pesados que no necesitan datos en tiempo real.
- **Extensión `pg_cron`** para tareas programadas (expirar puntos de fidelización, enviar recordatorios).
- **Full-text search** con índices GIN en lugar de `ilike` para búsqueda de clientes y productos.
- **Auditoría con `pgaudit`** si se requiere cumplimiento regulatorio.
- **Citas recurrentes**: tabla `recurring_bookings` para patrones semanales/mensuales.
- **Historial de cambios con temporal tables** (extensiones `temporal_tables` o `postgresql_unit`).
- **Sharding geográfico** si la plataforma se expande globalmente.

---

_Documento generado el: 04/07/2026_
_Versión: 1.0_
_Próximo documento: 08-authentication.md_
