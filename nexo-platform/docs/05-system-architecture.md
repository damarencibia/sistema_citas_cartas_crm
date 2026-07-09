# 05 — System Architecture

## Objetivo

Definir la arquitectura general del sistema, los patrones arquitectónicos, la organización en capas, los flujos de datos y los principios de diseño que gobernarán la implementación.

---

## Alcance

Cubre la arquitectura de alto nivel, la separación en capas (frontend, backend, base de datos), los patrones de comunicación, el modelo de modularización, y las decisiones arquitectónicas fundamentales. No cubre implementación específica de módulos.

---

## Dependencias

- 00-project-vision.md — Define los principios rectores (modularidad, multi-tenant, clean architecture).
- 01-business-requirements.md — Define los actores y necesidades de negocio.
- 03-non-functional-requirements.md — Define atributos de calidad que la arquitectura debe satisfacer.
- 04-tech-stack.md — Define las tecnologías sobre las que se construye la arquitectura.

---

## Principios Arquitectónicos

1. **Clean Architecture**: Separación en capas con dependencias hacia adentro. El dominio y la lógica de negocio no dependen de frameworks ni infraestructura.
2. **Modular monolito**: El frontend es una SPA modular donde cada módulo es independiente con sus propios componentes, stores, tipos y lógica. Los módulos se comunican mediante interfaces explícitas.
3. **Backend declarativo**: Siempre que sea posible, la lógica de negocio se implementa mediante RLS (Row Level Security) en PostgreSQL en lugar de código imperativo en servidores. Las Edge Functions se usan solo cuando RLS no es suficiente.
4. **API REST + Realtime**: La comunicación frontend-backend utiliza REST para operaciones CRUD y WebSockets (Supabase Realtime) para actualizaciones en vivo.
5. **Seguridad por diseño**: Cada capa valida y autoriza. El frontend nunca confía en el backend ciegamente ni viceversa.

---

## Diagrama de Arquitectura General

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           USUARIOS                                      │
│   (Super Admin / Propietario / Admin / Empleado / Cliente)              │
└────────────────────────┬────────────────────────────────────────────────┘
                         │ HTTPS
┌────────────────────────▼────────────────────────────────────────────────┐
│                         VERCEL (CDN)                                   │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                     FRONTEND (Vue 3 SPA)                        │  │
│  │                                                                  │  │
│  │  ┌──────────────────────────────────────────────────────────┐   │  │
│  │  │              APP LAYER                                    │   │  │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │   │  │
│  │  │  │  Router  │ │  Guards  │ │  Layouts │ │   i18n   │   │   │  │
│  │  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │   │  │
│  │  └──────────────────────────────────────────────────────────┘   │  │
│  │                                                                  │  │
│  │  ┌──────────────────────────────────────────────────────────┐   │  │
│  │  │           MODULE LAYER (Cada módulo independiente)       │   │  │
│  │  │                                                          │   │  │
│  │  │  ┌─────────────────┐  ┌─────────────────┐  ┌──────────┐ │   │  │
│  │  │  │   Appointments  │  │  Digital Menu   │  │   CRM    │ │   │  │
│  │  │  │   Module        │  │   Module        │  │  Module  │ │   │  │
│  │  │  │                 │  │                 │  │          │ │   │  │
│  │  │  │ • Views         │  │ • Views         │  │ • Views  │ │   │  │
│  │  │  │ • Components    │  │ • Components    │  │ • Comp.  │ │   │  │
│  │  │  │ • Store (Pinia) │  │ • Store (Pinia) │  │ • Store  │ │   │  │
│  │  │  │ • Composables   │  │ • Composables   │  │ • Compo. │ │   │  │
│  │  │  │ • Types         │  │ • Types         │  │ • Types  │ │   │  │
│  │  │  │ • i18n          │  │ • i18n          │  │ • i18n   │ │   │  │
│  │  │  └─────────────────┘  └─────────────────┘  └──────────┘ │   │  │
│  │  └──────────────────────────────────────────────────────────┘   │  │
│  │                                                                  │  │
│  │  ┌──────────────────────────────────────────────────────────┐   │  │
│  │  │              SHARED / CROSS-CUTTING                       │   │  │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │   │  │
│  │  │  │   Auth   │ │   API    │ │   UI     │ │  Utils   │   │   │  │
│  │  │  │  Store   │ │  Client  │ │Components│ │          │   │   │  │
│  │  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │   │  │
│  │  └──────────────────────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────────────────┘
                         │ HTTPS
                         │
┌────────────────────────▼────────────────────────────────────────────────┐
│                         SUPABASE                                       │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │              DATABASE LAYER (PostgreSQL 15)                     │   │
│  │                                                                  │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │   │
│  │  │  Tenant      │  │  Appointments│  │  DigitalMenu │          │   │
│  │  │  Schema      │  │  Tables      │  │  Tables      │          │   │
│  │  │              │  │              │  │              │          │   │
│  │  │ • tenants    │  │ • services   │  │ • categories │          │   │
│  │  │ • users      │  │ • employees  │  │ • products   │          │   │
│  │  │ • plans      │  │ • schedules  │  │ • variants   │          │   │
│  │  │ • modules    │  │ • bookings   │  │ • extras     │          │   │
│  │  │              │  │              │  │ • orders     │          │   │
│  │  │              │  │              │  │ • tables     │          │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘          │   │
│  │                                                                  │   │
│  │  ┌──────────────────────────────────────────────────────────┐   │   │
│  │  │           RLS POLICIES (Seguridad multi-tenant)          │   │   │
│  │  │  • Cada tabla tiene policy que filtra por tenant_id      │   │   │
│  │  │  • Cada usuario solo ve datos de su tenant               │   │   │
│  │  │  • Roles: propietario, admin, empleado, cliente          │   │   │
│  │  └──────────────────────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │              AUTH LAYER (JWT)                                    │   │
│  │  │  • Supabase Auth                                              │   │
│  │  │  • JWT con claims de tenant_id y role                         │   │
│  │  │  • RLS usa el JWT para identificar usuario y tenant           │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │          EDGE FUNCTIONS (Deno - solo cuando necesario)          │   │
│  │                                                                  │   │
│  │  • notify-appointment-reminder  →  Envía recordatorio de cita  │   │
│  │  • send-order-notification      →  Notifica nuevo pedido        │   │
│  │  • process-loyalty-points       →  Calcula puntos de fidelización│   │
│  │  • export-csv                   →  Exporta datos a CSV          │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │              STORAGE LAYER (S3 + CDN)                            │   │
│  │  │  • tenant-logos      →  Logos de negocios                     │   │
│  │  │  • product-images    →  Imágenes de productos                 │   │
│  │  │  • qr-codes          →  Códigos QR generados                  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Capas Arquitectónicas

### Capa 1: Frontend (Presentación)

La capa de presentación es una SPA (Single Page Application) construida con Vue 3. Se despliega en Vercel y se sirve desde CDN global.

**Responsabilidades**:

- Renderizar la interfaz de usuario
- Manejar la interacción del usuario
- Validar datos de entrada (client-side)
- Mantener el estado de la aplicación (Pinia)
- Enrutamiento y guards de navegación
- Internacionalización

**No responsabilidades**:

- Acceder directamente a la base de datos
- Ejecutar lógica de negocio sensible (precios, disponibilidad)
- Almacenar tokens sensibles

**Estructura interna**:

```
src/
  app/                    # Configuración global de la app
    router/               # Rutas y guards
    i18n/                 # Configuración de vue-i18n
    plugins/              # Plugins de Vue
    App.vue               # Componente raíz
    main.ts               # Punto de entrada

  shared/                 # Código compartido entre módulos
    components/           # Componentes UI reutilizables
    composables/          # Lógica reactiva reutilizable
    stores/               # Stores compartidas (auth, tenant)
    types/                # Tipos compartidos
    utils/                # Utilidades
    api/                  # Cliente HTTP (Axios + supabase-js)

  modules/                # Módulos de la aplicación
    appointments/         # Módulo de citas
      views/              # Páginas del módulo
      components/         # Componentes del módulo
      stores/             # Estado del módulo
      composables/        # Lógica del módulo
      types/              # Tipos del módulo
      i18n/               # Traducciones del módulo
    digital-menu/         # Módulo de carta digital
      ...
    crm/                  # Módulo de CRM
      ...
    admin/                # Módulo de administración del negocio
      ...
```

### Capa 2: API / Comunicación

La comunicación entre frontend y Supabase se realiza de dos formas:

**A. Cliente supabase-js (operaciones directas con RLS)**:

- El frontend usa el cliente `supabase-js` para consultar y modificar datos directamente.
- Cada consulta está protegida por RLS: el tenant_id se extrae del JWT y se aplica automáticamente.
- Apropiado para: CRUD básico, listados, consultas simples.

```
Ejemplo de flujo:
1. Usuario autenticado → JWT en header
2. Frontend: supabase.from('services').select('*')
3. Supabase: RLS policy filtra WHERE tenant_id = auth.jwt()->>'tenant_id'
4. Respuesta: solo servicios del tenant del usuario
```

**B. Edge Functions (lógica de negocio compleja)**:

- El frontend invoca Edge Functions mediante Axios o el cliente de Supabase.
- Se usan cuando la operación requiere lógica que no puede expresarse en RLS.
- Apropiado para: notificaciones, cálculos complejos, integraciones externas.

```
Ejemplo de flujo:
1. Usuario confirma cita
2. Frontend: supabase.from('bookings').insert({...})  →  RLS permite inserción
3. Trigger PostgreSQL detecta nuevo booking
4. Edge Function se activa (o es invocada explícitamente)
5. Edge Function envía email de confirmación
```

### Capa 3: Base de Datos (PostgreSQL + RLS)

La base de datos es el centro de la arquitectura. Alberga los datos, la lógica de seguridad (RLS) y parte de la lógica de negocio (triggers, constraints).

**Responsabilidades**:

- Almacenamiento persistente de datos
- Aislamiento multi-tenant mediante RLS
- Validación de integridad referencial
- Índices para rendimiento
- Triggers para auditoría y actualizaciones automáticas

**Estrategia Multi-tenant**: Fila única con `tenant_id` en todas las tablas. RLS policies filtran automáticamente por `tenant_id` extraído del JWT.

**Ver documento**: 07-database-design.md para el detalle completo.

### Capa 4: Edge Functions (Lógica Serverless)

Las Edge Functions de Supabase ejecutan código TypeScript/Deno en el edge. Son stateless y se invocan bajo demanda.

**Responsabilidades**:

- Lógica de negocio que no puede implementarse con RLS
- Integración con servicios externos (email, SMS)
- Procesamiento asíncrono (cálculo de puntos de fidelización)
- Exportación de datos
- Webhooks

**Cuándo NO usar Edge Functions**:

- Operaciones CRUD simples (usar RLS + cliente directo)
- Lógica que puede implementarse con constraints de PostgreSQL
- Operaciones que requieren estado (las EF son stateless)

---

## Flujo de Datos por Escenario

### Escenario 1: Reserva de Cita

```
1. Cliente visita portal de reservas del negocio
2. Frontend carga servicios, empleados y disponibilidad
   → supabase.from('services').select('*')  [RLS filtra por tenant_id del negocio público]
3. Cliente selecciona servicio, empleado, fecha y hora
4. Frontend valida disponibilidad (local)
5. Cliente confirma reserva
6. Frontend ejecuta: supabase.from('bookings').insert({...})
   → RLS verifica que el tenant_id coincide con el JWT
   → Constraint CHECK verifica que la fecha es futura
   → Trigger BEFORE INSERT verifica disponibilidad (no solapamiento)
7. Si ok: se inserta el booking
   → Trigger AFTER INSERT crea registro en tabla audit_log
   → (Opcional) Edge Function envía email de confirmación
8. Frontend muestra confirmación
   → Supabase Realtime notifica al panel del empleado
9. 24h antes: Edge Function (cron) envía recordatorio
```

### Escenario 2: Pedido por QR

```
1. Cliente escanea QR de mesa
2. Frontend carga carta digital del negocio
   → URL pública con parámetro table_id
   → supabase.from('products').select('*, category(*)') con RLS público
3. Cliente navega, selecciona productos, personaliza variantes/extras
4. Cliente confirma pedido
5. Frontend: supabase.from('orders').insert({...})
   → RLS permite inserción (política pública para pedidos)
6. Pedido creado con estado 'pending'
   → Realtime notifica al panel de empleados en tiempo real
7. Empleado ve el pedido, cambia estado a 'preparing'
   → Realtime actualiza la vista del cliente
8. Empleado cambia a 'ready', luego 'delivered'
   → Cada cambio se refleja en tiempo real en el frontend del cliente
```

### Escenario 3: CRM - Consulta de Cliente

```
1. Empleado busca cliente por nombre
2. Frontend: supabase.from('customers').select('*').ilike('name', '%text%')
   → RLS filtra automáticamente por tenant_id
3. Empleado selecciona cliente, ve perfil completo
4. Frontend carga perfil: datos + historial de citas + historial de pedidos + notas
   → Tres queries paralelas filtradas por tenant_id y customer_id
5. Empleado agrega nota privada
6. Frontend: supabase.from('customer_notes').insert({...})
   → RLS verifica tenant_id y que el usuario es employee o admin
```

---

## Patrones de Diseño

### 1. Repository Pattern (Frontend)

Cada módulo tiene funciones repository que abstraen el acceso a datos. Esto permite cambiar la fuente de datos sin afectar los componentes.

```typescript
// modules/appointments/repositories/booking.repository.ts
export const bookingRepository = {
  async getByDate(date: string): Promise<Booking[]> {
    const { data } = await supabase
      .from('bookings')
      .select('*, service(*), employee(*)')
      .gte('date', date)
      .lt('date', addDays(date, 1))
      .order('time');
    return data ?? [];
  },

  async create(booking: CreateBookingDTO): Promise<Booking> {
    const { data } = await supabase.from('bookings').insert(booking).select('*').single();
    return data;
  },
};
```

### 2. Store Pattern (Pinia)

Cada módulo tiene su propia store de Pinia que maneja el estado de la UI y delega en los repositories.

```typescript
// modules/appointments/stores/booking.store.ts
export const useBookingStore = defineStore('appointments/bookings', () => {
  const bookings = ref<Booking[]>([]);
  const loading = ref(false);

  async function fetchBookings(date: string) {
    loading.value = true;
    bookings.value = await bookingRepository.getByDate(date);
    loading.value = false;
  }

  return { bookings, loading, fetchBookings };
});
```

### 3. Composable Pattern

La lógica reactiva reutilizable se encapsula en composables.

```typescript
// modules/appointments/composables/useBookingForm.ts
export function useBookingForm() {
  const form = reactive({ service: null, employee: null, date: '', time: '' });
  const errors = reactive<Record<string, string>>({});
  const availability = ref<TimeSlot[]>([]);

  async function loadAvailability() {
    if (form.service && form.employee && form.date) {
      availability.value = await bookingRepository.getAvailableSlots(
        form.service.id,
        form.employee.id,
        form.date,
      );
    }
  }

  watch([() => form.service, () => form.employee, () => form.date], loadAvailability);

  return { form, errors, availability, loadAvailability };
}
```

### 4. Provider Pattern (Vue Provide/Inject)

El tenant actual y el usuario autenticado se proveen desde el nivel raíz de la aplicación para que cualquier componente pueda acceder a ellos sin prop drilling.

---

## Gestión de Estado Global

| Store                   | Propósito                                   | Alcance |
| ----------------------- | ------------------------------------------- | ------- |
| `auth`                  | Usuario autenticado, sesión, JWT            | Global  |
| `tenant`                | Tenant actual (negocio), configuración      | Global  |
| `ui`                    | Estado de UI global (sidebar, tema, idioma) | Global  |
| `appointments/bookings` | Citas del módulo                            | Módulo  |
| `appointments/services` | Servicios del módulo                        | Módulo  |
| `digital-menu/products` | Productos del módulo                        | Módulo  |
| `digital-menu/orders`   | Pedidos del módulo                          | Módulo  |
| `crm/customers`         | Clientes del módulo                         | Módulo  |

Las stores globales (`auth`, `tenant`, `ui`) se definen en `shared/stores/`. Las stores de módulo se definen dentro de cada módulo.

---

## Comunicación entre Módulos

Los módulos **no se importan directamente entre sí**. La comunicación entre módulos ocurre de las siguientes formas:

1. **A través de la base de datos**: El módulo CRM lee citas y pedidos de las tablas compartidas en la base de datos.
2. **A través de stores globales**: Un módulo puede leer el estado de `auth` o `tenant` para condicionar su comportamiento.
3. **A través de eventos**: Para comunicación en tiempo real entre módulos, se usa el sistema de eventos de Vue (emits) o un bus de eventos simple.

**Regla**: Un módulo de citas no importa nada del módulo de CRM. El CRM accede a los datos de citas directamente desde la base de datos a través de su propio repository.

---

## Estrategia de Caché

| Nivel   | Tipo                                      | Duración                                       | Implementación          |
| ------- | ----------------------------------------- | ---------------------------------------------- | ----------------------- |
| HTTP    | Assets estáticos (JS, CSS, imágenes)      | 1 año con hash en nombre                       | Vercel CDN              |
| HTTP    | API responses                             | 5 minutos (endpoints públicos)                 | Cache-Control headers   |
| Cliente | Datos de catálogos (servicios, productos) | Sesión                                         | Pinia                   |
| Cliente | Datos de disponibilidad                   | Bajo demanda (se recarga al cambiar selección) | Pinia                   |
| Cliente | Perfil de usuario y tenant                | Sesión                                         | Pinia + localStorage    |
| Cliente | Traducciones                              | 1 hora                                         | vue-i18n + localStorage |

---

## Decisiones Arquitectónicas Clave (ADRs)

### ADR-001: RLS como principal mecanismo de autorización

**Contexto**: Necesitamos asegurar que cada usuario solo acceda a datos de su tenant.

**Decisión**: Usar Row Level Security de PostgreSQL como el principal mecanismo de autorización. Cada tabla tiene una columna `tenant_id` y policies RLS que verifican `tenant_id = auth.jwt() ->> 'tenant_id'`.

**Consecuencias**:

- La autorización ocurre a nivel de base de datos, la capa más cercana a los datos.
- No se necesita lógica de servidor para verificar permisos en operaciones CRUD básicas.
- El frontend puede consultar la base de datos directamente (con el JWT) sin intermediarios.
- Las RLS policies deben probarse exhaustivamente para evitar fugas de datos.

### ADR-002: Tenant ID en todas las tablas (fila única)

**Contexto**: Necesitamos aislar datos entre tenantes.

**Decisión**: Usar el enfoque de "fila única" (single row isolation) donde cada tabla tiene una columna `tenant_id` que referencia al tenant. No usamos schemas por tenant.

**Consecuencias**:

- Simplicidad: una sola base de datos, un solo schema.
- Escalabilidad: hasta ~1000 tenantes sin problemas de rendimiento.
- Mantenimiento simple: migraciones únicas para todos los tenantes.
- Backup único: toda la plataforma se respalda junta.
- Límite: si superamos ~1000 tenantes activos, considerar migrar a schemas por tenant.

### ADR-003: Edge Functions solo para lógica que RLS no puede manejar

**Contexto**: Necesitamos ejecutar lógica de negocio que no puede expresarse en RLS (enviar emails, cálculos complejos, integraciones externas).

**Decisión**: Usar Edge Functions de Supabase exclusivamente para operaciones que RLS o triggers de PostgreSQL no pueden resolver. La mayoría del CRUD se maneja con RLS + cliente directo.

**Consecuencias**:

- Menos latencia (evitamos round-trip a un servidor).
- Menos código de backend que mantener.
- Menor costo (menos invocaciones de funciones).
- Las Edge Functions se usan para: notificaciones, webhooks, exportaciones, cálculos de fidelización.

### ADR-004: Frontend como SPA modular, no SSR

**Contexto**: Necesitamos una aplicación rápida y modular.

**Decisión**: Usar Vue 3 como SPA (Single Page Application) desplegada en Vercel, no SSR (Server-Side Rendering).

**Consecuencias**:

- Menor tiempo de desarrollo inicial.
- Despliegue simple en Vercel (static export).
- El SEO de las páginas públicas (carta digital) se maneja con meta tags dinámicos y prerendering de Vite.
- Si en el futuro se necesita SSR, migrar a Nuxt 3 es factible.

### ADR-005: Repositorios como abstracción de datos

**Contexto**: Necesitamos desacoplar la lógica de acceso a datos de los componentes y stores.

**Decisión**: Implementar el patrón Repository en cada módulo. Los componentes y stores nunca llaman a `supabase.from('table')` directamente; lo hacen a través de funciones repository.

**Consecuencias**:

- Si cambiamos la fuente de datos (ej: de supabase-js a Edge Functions), solo cambiamos el repository.
- Los tests pueden mockear los repositories fácilmente.
- Las consultas complejas están encapsuladas en un solo lugar.
- Lightweight: los repositories son funciones, no clases.

---

## Manejo de Errores (Cross-cutting)

```
Error Flow:
1. Frontend (componente) → llamada a repository
2. Repository → llamada a Supabase
3. Supabase → RLS valida, o Edge Function procesa
4. Si error: Supabase devuelve error estructurado
5. Repository transforma error a formato de la app
6. Store captura error y actualiza estado
7. Componente muestra error (snackbar/toast)
```

**Categorías de error**:

- `VALIDATION_ERROR`: datos inválidos (mostrar en el formulario).
- `AUTHORIZATION_ERROR`: el usuario no tiene permiso (redirigir o mostrar mensaje).
- `NOT_FOUND`: el recurso no existe (404).
- `CONFLICT`: conflicto de disponibilidad (slot ya ocupado).
- `RATE_LIMIT`: demasiadas solicitudes.
- `NETWORK_ERROR`: error de conexión (reintentar).
- `SERVER_ERROR`: error interno (mostrar mensaje genérico).

---

## Decisiones Tomadas

| Decisión                 | Opción                   | Alternativas                           | Justificación                                                         |
| ------------------------ | ------------------------ | -------------------------------------- | --------------------------------------------------------------------- |
| Aislamiento multi-tenant | Fila única (tenant_id)   | Schema por tenant, DB por tenant       | Simplicidad operativa. Suficiente para < 1000 tenantes.               |
| Autorización             | RLS como principal       | Middleware de servidor, Edge Functions | Menor latencia, menor costo, seguridad a nivel de DB.                 |
| Comunicación módulos     | Base de datos compartida | Mensajería, eventos                    | Simplicidad. Los módulos comparten DB pero cada uno tiene sus tablas. |
| Gestión de estado        | Pinia (stores)           | Vuex, reactive global                  | Type-safe, modular, fácil de testear.                                 |
| Patrón de acceso a datos | Repository               | ORM, queries directas                  | Abstracción ligera, fácil de mockear.                                 |
| SSR                      | No (SPA)                 | Nuxt 3, Quasar SSR                     | SPA es suficiente para este alcance. SSR se añade si se necesita SEO. |

---

## Posibles Mejoras Futuras

- Migrar a **schemas por tenant** en PostgreSQL si se superan los 1000 tenantes activos.
- Implementar **CQRS** si la carga de lecturas y escrituras requiere caminos separados.
- Introducir un **message broker** (RabbitMQ, Redis Pub/Sub) para comunicación asíncrona entre módulos.
- Migrar a **Nuxt 3** si se necesita SSR para SEO en páginas públicas.
- Implementar **GraphQL** (via Graphile o Hasura) si las consultas se vuelven demasiado complejas.
- **Event Sourcing** para el historial de cambios si se requiere auditoría completa.

---

_Documento generado el: 04/07/2026_
_Versión: 1.0_
_Próximo documento: 06-folder-structure.md_
