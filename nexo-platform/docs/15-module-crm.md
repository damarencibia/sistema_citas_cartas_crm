# 15 — Module: CRM (Customer Relationship Management)

## Objetivo

Definir en detalle el Módulo de CRM: componentes, stores, repositorios, flujos de trabajo, reglas de negocio, programa de fidelización, integración con los módulos de Citas y Carta Digital, y consideraciones de implementación.

---

## Alcance

Cubre todos los aspectos del módulo de CRM: gestión de clientes, registro automático desde interacciones, notas, etiquetas, historial, búsqueda, programa de fidelización basado en puntos, y estadísticas básicas.

---

## Dependencias

- 02-functional-requirements.md — Define los requisitos funcionales FR-301 a FR-309.
- 05-system-architecture.md — Define la arquitectura del módulo.
- 06-folder-structure.md — Define la estructura de archivos del módulo.
- 07-database-design.md — Define las tablas `customers`, `customer_notes`, `tags`, `customer_tags`, `loyalty_points`, `loyalty_config`.
- 10-user-roles.md — Define los permisos por rol en el módulo.
- 12-navigation.md — Define las rutas del módulo.

---

## Vista General del Módulo

El módulo CRM centraliza toda la información de los clientes del negocio. Se alimenta automáticamente de las interacciones en los módulos de Citas y Carta Digital. Proporciona herramientas para segmentar clientes (etiquetas), registrar información contextual (notas), y fidelizar (programa de puntos).

---

## Estructura del Módulo

```
src/modules/crm/
├── views/
│   ├── CustomerListView.vue        # Lista de clientes con búsqueda y filtros
│   ├── CustomerDetailView.vue      # Perfil completo del cliente
│   ├── TagsManagementView.vue      # Gestión de etiquetas (CRUD)
│   ├── LoyaltyConfigView.vue       # Configuración del programa de fidelización
│   ├── CustomerStatsView.vue       # Estadísticas de clientes
│   └── ClientPortalView.vue        # Portal del cliente (autogestión)
│
├── components/
│   ├── CustomerCard.vue            # Tarjeta resumen de cliente
│   ├── CustomerTable.vue           # Tabla de clientes con columnas configurables
│   ├── CustomerSearch.vue          # Búsqueda avanzada de clientes
│   ├── CustomerInfo.vue            # Sección de información del cliente
│   ├── CustomerHistoryTabs.vue     # Pestañas con historial (citas, pedidos, notas)
│   ├── NoteList.vue                # Lista cronológica de notas
│   ├── NoteForm.vue                # Formulario para agregar nota
│   ├── TagBadge.vue                # Badge de etiqueta con color
│   ├── TagSelector.vue             # Selector de etiquetas (autocomplete + crear)
│   ├── VisitHistory.vue            # Historial de visitas (citas + pedidos)
│   ├── LoyaltyCard.vue             # Tarjeta de fidelización del cliente
│   ├── PointsDisplay.vue           # Display de puntos ganados/canjeados
│   └── CustomerStats.vue           # Widgets de estadísticas
│
├── stores/
│   ├── customer.store.ts
│   ├── tag.store.ts
│   └── loyalty.store.ts
│
├── composables/
│   ├── useCustomerSearch.ts
│   ├── useCustomerHistory.ts
│   └── useLoyaltyPoints.ts
│
├── repositories/
│   ├── customer.repository.ts
│   ├── tag.repository.ts
│   └── loyalty.repository.ts
│
├── types/
│   ├── customer.types.ts
│   ├── tag.types.ts
│   └── loyalty.types.ts
│
└── i18n/
    ├── en.json
    ├── es.json
    └── pt.json
```

---

## Flujos de Trabajo Principales

### Flujo 1: Registro Automático de Clientes

El CRM se alimenta automáticamente sin intervención manual:

```
Evento: Cliente agenda una cita online
    ↓
Trigger en bookings (AFTER INSERT):
  1. Buscar cliente por email en la tabla customers
  2. Si existe: actualizar last_visit_at, total_visits
  3. Si no existe: crear nuevo registro en customers
     con nombre, email, teléfono desde la reserva
    ↓
El cliente aparece automáticamente en el CRM

Evento: Cliente hace un pedido por QR
    ↓
Trigger en orders (AFTER INSERT):
  1. Si el cliente proporcionó email:
     - Buscar o crear en customers (misma lógica)
  2. Si el cliente no dio email:
     - Se crea un registro con solo el nombre
     - Queda como "cliente pendiente de identificar"

Evento: Cita completada o pedido entregado
    ↓
Trigger en bookings/orders (AFTER UPDATE status):
  1. Actualizar total_visits, total_spent, last_visit_at
  2. Si aplica: acreditar puntos de fidelización automáticamente
```

### Flujo 2: Búsqueda y Visualización de Cliente

```
1. Empleado navega a /crm/customers
2. Ve lista paginada de clientes (20 por página)
   - Columnas: nombre, email, teléfono, visitas, última visita, etiquetas
   - Ordenable por cualquier columna
   - Búsqueda global en tiempo real

3. Filtros disponibles:
   - Búsqueda por texto (nombre, email, teléfono)
   - Filtro por etiquetas (múltiple selección)
   - Filtro por rango de fechas (última visita, registro)
   - Filtro por número de visitas (más de X visitas)

4. Empleado hace clic en un cliente → CustomerDetailView
   - Pestaña "Información": datos personales, etiquetas, resumen
   - Pestaña "Historial": timeline de citas y pedidos
   - Pestaña "Notas": notas privadas del personal
   - Pestaña "Fidelización": puntos, canjes, niveles

5. Desde el detalle, el empleado puede:
   - Editar datos del cliente
   - Agregar/quitar etiquetas
   - Agregar nota
   - Ver detalle de cita/pedido específico (link al módulo correspondiente)
```

### Flujo 3: Gestión de Etiquetas

```
Crear etiqueta:
1. Admin navega a /crm/tags
2. Click "Nueva etiqueta"
3. Nombre y color
4. Guardar → etiqueta disponible para asignar a clientes

Asignar etiqueta a cliente:
1. Desde CustomerDetailView, sección "Etiquetas"
2. Click en TagSelector
3. Autocomplete busca etiquetas existentes
4. Click en etiqueta → se asigna al cliente
5. Opción "Crear nueva" si no existe

Etiquetas predefinidas del sistema:
  - VIP (color dorado)
  - Frecuente (color verde) — asignada automáticamente después de 5 visitas
  - Nuevo (color azul) — asignada automáticamente en la primera visita
  - Inactivo (color gris) — asignada automáticamente después de 90 días sin visita

Filtrar por etiquetas:
1. En CustomerListView, filtro de etiquetas
2. Seleccionar una o múltiples etiquetas
3. La lista se filtra para mostrar solo clientes con esas etiquetas
```

### Flujo 4: Notas del Cliente

```
1. Empleado está en CustomerDetailView
2. Pestaña "Notas"
3. Ve lista cronológica de notas (más reciente primero)
   - Cada nota muestra: contenido, autor, fecha
4. Click "Agregar nota"
5. Escribe contenido y guarda
6. Nota agregada con autor = empleado actual y timestamp

Reglas:
  - Las notas solo las ve el personal del negocio
  - El cliente no puede ver las notas
  - Una nota se puede editar dentro de los primeros 5 minutos
  - Las notas no se pueden eliminar (solo super admin)
```

### Flujo 5: Programa de Fidelización

```
Configuración (LoyaltyConfigView):
  1. Propietario navega a /crm/loyalty
  2. Activar programa (toggle is_active)
  3. Configurar parámetros:
     - Puntos por visita: 10
     - Puntos por cada $100 gastados: 1
     - Puntos de bienvenida: 50
     - 100 puntos = $50 de descuento
     - Expiración: 6 meses
  4. Guardar configuración

Acumulación de puntos:
  - Automática: al completar una cita o entregar un pedido
  - El trigger process-loyalty-points calcula:
    → Puntos por visita + (total_gastado / currency_unit * points_per_currency)
  - Se registra en loyalty_points con reason = 'visit' o 'purchase'

Consulta de puntos:
  - El empleado ve los puntos en CustomerDetailView
  - El cliente (con cuenta) ve sus puntos en ClientPortalView
  - Dashboard muestra: puntos totales, puntos próximos a expirar

Canje de puntos:
  1. Cliente solicita canje (o empleado lo sugiere)
  2. Empleado inicia canje desde CustomerDetailView
  3. Sistema calcula descuento máximo basado en puntos disponibles
  4. Empleado aplica descuento en el servicio/producto
  5. Puntos deducidos con reason = 'redeem'
  (En v1 el canje es manual; en futura versión se integra con el checkout)
```

---

## Componentes Clave

### `CustomerTable.vue`

Tabla de clientes con funcionalidades completas:

```typescript
interface CustomerTableConfig {
  search: string;
  tags: string[];
  dateRange: [string, string] | null;
  minVisits: number | null;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  page: number;
  perPage: number; // 20
}

// Características:
// - Virtual scrolling para listas grandes
// - Columnas configurables (el usuario puede mostrar/ocultar)
// - Selección múltiple para acciones masivas (asignar etiqueta, exportar)
// - Exportar selección o resultados completos a CSV
```

### `CustomerHistoryTabs.vue`

Tabs que muestran el historial completo del cliente:

```
┌─────────────────────────────────────────┐
│ [📅 Citas] [🧾 Pedidos] [📝 Notas]    │
│─────────────────────────────────────────│
│                                         │
│ (Contenido de la pestaña activa)        │
│                                         │
│ Si es "Citas": timeline de citas        │
│   → Fecha, servicio, empleado, estado   │
│   → Link a detalle de cita              │
│                                         │
│ Si es "Pedidos": timeline de pedidos    │
│   → Fecha, productos, total, estado     │
│   → Link a detalle de pedido            │
│                                         │
│ Si es "Notas": lista de notas           │
│   → Fecha, autor, contenido             │
│   → Formulario para nueva nota          │
└─────────────────────────────────────────┘
```

### `TagSelector.vue`

Selector de etiquetas con autocomplete:

```vue
<template>
  <v-autocomplete
    v-model="selectedTags"
    :items="availableTags"
    item-title="name"
    item-value="id"
    label="Etiquetas"
    multiple
    chips
    closable-chips
    clearable
    :loading="loading"
    :search-input.sync="search"
    no-data-text="Escribe para crear nueva etiqueta"
  >
    <template #chip="{ item }">
      <v-chip :color="item.raw.color" text-color="white" small>
        {{ item.raw.name }}
      </v-chip>
    </template>
  </v-autocomplete>
</template>
```

---

## Stores

### `customer.store.ts`

```typescript
export const useCustomerStore = defineStore('crm/customers', () => {
  const customers = ref<Customer[]>([]);
  const currentCustomer = ref<Customer | null>(null);
  const loading = ref(false);
  const search = reactive({
    query: '',
    tags: [] as string[],
    dateFrom: null as string | null,
    dateTo: null as string | null,
    minVisits: null as number | null,
    sortBy: 'created_at',
    sortOrder: 'desc' as 'asc' | 'desc',
    page: 1,
  });
  const totalCount = ref(0);

  const filteredCustomers = computed(() => {
    /* lógica de filtro local */
  });

  async function fetchCustomers() {
    loading.value = true;
    const result = await customerRepository.search(search);
    customers.value = result.data;
    totalCount.value = result.count;
    loading.value = false;
  }

  async function fetchCustomerDetail(id: string) {
    currentCustomer.value = await customerRepository.getById(id);
  }

  async function addNote(customerId: string, content: string) {
    return await customerRepository.addNote(customerId, content);
  }

  return {
    customers,
    currentCustomer,
    loading,
    search,
    totalCount,
    filteredCustomers,
    fetchCustomers,
    fetchCustomerDetail,
    addNote,
  };
});
```

---

## Reglas de Negocio

| Regla                                | Dónde se valida | Implementación                                        |
| ------------------------------------ | --------------- | ----------------------------------------------------- |
| Email único por tenant               | DB              | `UNIQUE INDEX idx_customers_tenant_email`             |
| Cliente sin email puede existir      | DB              | Email nullable                                        |
| Nota no se elimina                   | Frontend        | Botón de eliminar no existe                           |
| Nota editable solo 5 minutos         | Frontend        | Comparar `created_at + 5min` con `now()`              |
| Etiquetas del sistema no se eliminan | Frontend + DB   | `is_system = true` deshabilita eliminación            |
| Puntos no pueden ser negativos       | DB              | `CHECK (points != 0)` excepto redeem                  |
| Puntos expiran a los 6 meses         | Cron            | Edge Function mensual que marca puntos como expirados |
| Cliente inactivo > 90 días           | Cron            | Tag automática "Inactivo"                             |

---

## Integración con Módulos de Citas y Carta Digital

### Dependencias de datos

El CRM depende de los módulos de Citas y Carta Digital para poblar sus datos:

```
CRM
  ├── Lee de bookings → historial de citas del cliente
  ├── Lee de orders → historial de pedidos del cliente
  ├── Reacciona a triggers en bookings/orders → actualiza estadísticas
  └── NO escribe en bookings/orders → solo consulta
```

### Eventos que originan acciones en CRM

| Módulo        | Evento                              | Acción en CRM                   |
| ------------- | ----------------------------------- | ------------------------------- |
| Citas         | Booking INSERT                      | Crear o actualizar customer     |
| Citas         | Booking UPDATE status → 'completed' | +1 visita, +puntos fidelización |
| Citas         | Booking UPDATE status → 'cancelled' | Nota opcional en customer       |
| Carta Digital | Order INSERT (con email)            | Crear o actualizar customer     |
| Carta Digital | Order UPDATE status → 'delivered'   | +1 visita, +$ gastado, +puntos  |
| Carta Digital | Order canjea puntos                 | -puntos fidelización            |

### Visualización de datos cruzados

En `CustomerDetailView`, las pestañas "Citas" y "Pedidos" son ejemplos de lectura cruzada de módulos. El repositorio de CRM consulta las tablas de otros módulos pero nunca las modifica.

```typescript
// repositories/customer.repository.ts
async function getBookingHistory(customerId: string, tenantId: string) {
  return await supabase
    .from('bookings')
    .select(
      'id, date, start_time, status, service:services(name), employee:employees(first_name, last_name)',
    )
    .eq('customer_id', customerId)
    .eq('tenant_id', tenantId)
    .order('date', { ascending: false });
}
```

---

## Portal del Cliente (Autogestión)

El portal del cliente permite a los clientes con cuenta gestionar su información:

### Vistas del Portal

| Ruta              | Funcionalidad                                    |
| ----------------- | ------------------------------------------------ |
| `/client/profile` | Ver y editar nombre, email, teléfono, contraseña |
| `/client/history` | Historial de citas y pedidos                     |
| `/client/loyalty` | Puntos acumulados, historial de puntos, canje    |

### Consideraciones del Portal

- El cliente se autentica contra Supabase Auth con su propia cuenta.
- El JWT del cliente contiene `role: 'customer'` y `tenant_id`.
- Las RLS policies permiten al cliente solo ver/modificar sus propios datos.
- El portal está en el mismo layout público de la plataforma.
- No requiere invitación: el cliente se registra voluntariamente.

---

## Edge Functions Relacionadas

| Función                  | Disparador                                    | Propósito                                               |
| ------------------------ | --------------------------------------------- | ------------------------------------------------------- |
| `process-loyalty-points` | AFTER UPDATE status → 'completed'/'delivered' | Calcular y acreditar puntos                             |
| `expire-loyalty-points`  | Cron (diario)                                 | Marcar puntos vencidos                                  |
| `auto-tag-inactive`      | Cron (semanal)                                | Asignar tag "Inactivo" a clientes sin visita en 90 días |
| `auto-tag-frequent`      | Cron (semanal)                                | Asignar tag "Frecuente" a clientes con 5+ visitas       |
| `send-loyalty-summary`   | Cron (mensual)                                | Email al cliente con resumen de puntos                  |

---

## Estadísticas del CRM

La vista de estadísticas (`CustomerStatsView`) muestra:

### KPIs en tarjetas

- **Total de clientes**: Cantidad total registrada
- **Clientes nuevos (este mes)**: Diferencia respecto al mes anterior
- **Tasa de retención**: Clientes que repitieron / total de clientes activos
- **Clientes inactivos**: Sin visita en 90 días
- **Clientes VIP**: Con 10+ visitas

### Gráficos

- **Clientes por mes**: Barras mensuales de nuevos registros
- **Visitas por día**: Línea semanal de visitas totales
- **Distribución por etiquetas**: Pastel con porcentajes
- **Top 10 clientes**: Tabla con los que más han gastado/visitado

### Consultas SQL para estadísticas

```sql
-- Clientes nuevos este mes
SELECT COUNT(*) FROM customers
WHERE tenant_id = $1
  AND created_at >= date_trunc('month', CURRENT_DATE)
  AND deleted_at IS NULL;

-- Tasa de retención (clientes con >1 visita / total con >=1 visita)
SELECT
  COUNT(*) FILTER (WHERE total_visits > 1) * 100.0 /
  NULLIF(COUNT(*) FILTER (WHERE total_visits >= 1), 0) AS retention_rate
FROM customers
WHERE tenant_id = $1 AND deleted_at IS NULL;
```

---

## Testing del Módulo

| Tipo        | Qué probar                                   | Herramienta           |
| ----------- | -------------------------------------------- | --------------------- |
| Unitario    | Lógica de cálculo de puntos de fidelización  | Vitest                |
| Unitario    | Lógica de auto-tags (inactivo, frecuente)    | Vitest                |
| Unitario    | Stores: customer, tag, loyalty               | Vitest + Pinia        |
| Componentes | `CustomerTable`, `TagSelector`, `NoteList`   | Vue Test Utils        |
| Integración | Registro automático de cliente desde booking | Playwright + Supabase |
| Integración | Flujo de canje de puntos                     | Playwright            |
| E2E         | Búsqueda y filtrado de clientes              | Playwright            |
| E2E         | Portal del cliente: autogestión de datos     | Playwright            |
| Seguridad   | Cliente no puede ver notas privadas          | Playwright + RLS test |

---

## Decisiones Tomadas

| Decisión              | Opción                             | Alternativas                          | Justificación                                                                                               |
| --------------------- | ---------------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Registro de clientes  | Automático desde interacciones     | Solo manual, solo registro voluntario | Captura clientes sin fricción. El cliente no necesita "registrarse en el CRM".                              |
| Notas privadas        | Solo personal del negocio          | Visibles al cliente                   | Las notas pueden contener información sensible para el negocio (preferencias, alertas, crédito).            |
| Canje de puntos       | Manual (empleado aplica descuento) | Automático en checkout                | Más simple en v1. El checkout automatizado es una mejora futura.                                            |
| Etiquetas del sistema | Asignación automática vía cron     | Tiempo real (trigger)                 | Cron semanal es suficiente para este tipo de etiquetas. No requiere tiempo real.                            |
| Estadísticas          | SQL directo en repositorio         | Agregaciones precalculadas            | Para el volumen esperado, SQL directo es suficiente. Si la escala crece, se implementan materialized views. |

---

## Posibles Mejoras Futuras

- **Segmentación avanzada**: Crear segmentos dinámicos basados en múltiples condiciones (etiquetas + visitas + gasto + fecha).
- **Campañas de marketing**: Enviar emails/SMS a un segmento específico (ej: "Clientes inactivos" con cupón de descuento).
- **Pipeline de ventas**: Seguimiento de leads, oportunidades, conversiones.
- **Encuestas de satisfacción**: Email post-visita con encuesta NPS.
- **Importación/exportación de clientes**: CSV con mapeo de columnas.
- **Integración con WhatsApp**: Comunicación directa con el cliente desde el CRM.
- **Historial de precios**: Registrar cambios de precios de servicios/productos que afectaron al cliente.
- **Notificaciones automáticas**: Saludar al cliente en su cumpleaños, ofrecer descuento por aniversario.
- **Chat interno**: Comunicación entre empleados sobre un cliente específico.
- **Documentos adjuntos**: Subir fotos, autorizaciones, recetas al perfil del cliente.
- **Webhooks**: Notificar a sistemas externos cuando se crea o actualiza un cliente.

---

_Documento generado el: 04/07/2026_
_Versión: 1.0_
_Próximo documento: 16-api-design.md_
