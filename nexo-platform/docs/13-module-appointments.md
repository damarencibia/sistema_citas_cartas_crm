# 13 — Module: Appointments (Sistema de Citas)

## Objetivo

Definir en detalle el Módulo de Citas: componentes, stores, repositorios, flujos de trabajo, reglas de negocio, integraciones con otros módulos y consideraciones de implementación.

---

## Alcance

Cubre todos los aspectos del módulo de citas: gestión de servicios, empleados, horarios, agenda, reservas, cancelaciones, reprogramaciones y portal público de reservas.

---

## Dependencias

- 02-functional-requirements.md — Define los requisitos funcionales FR-101 a FR-111.
- 05-system-architecture.md — Define la arquitectura del módulo.
- 06-folder-structure.md — Define la estructura de archivos del módulo.
- 07-database-design.md — Define las tablas `services`, `employees`, `employee_services`, `schedules`, `schedule_breaks`, `holiday_exceptions`, `bookings`.
- 10-user-roles.md — Define los permisos por rol en el módulo.
- 12-navigation.md — Define las rutas del módulo.

---

## Vista General del Módulo

El módulo de citas permite a los negocios gestionar su agenda de servicios. Los propietarios/admins configuran los servicios, empleados y horarios. Los clientes reservan online a través del portal público. Los empleados gestionan las citas desde su agenda.

---

## Estructura del Módulo

```
src/modules/appointments/
├── views/
│   ├── AgendaView.vue              # Agenda general/del empleado
│   ├── ServicesView.vue            # Gestión de servicios (CRUD)
│   ├── EmployeesView.vue           # Gestión de empleados
│   ├── SchedulesView.vue           # Gestión de horarios
│   ├── BookingsView.vue            # Listado/grid de reservas
│   ├── BookingHistoryView.vue      # Historial de reservas
│   └── PublicBookingView.vue       # Portal público de reservas
│
├── components/
│   ├── BookingCalendar.vue         # Calendario de citas (vista day/week/month)
│   ├── BookingCard.vue             # Tarjeta de resumen de cita
│   ├── BookingForm.vue             # Formulario de crear/editar cita
│   ├── BookingDetailDialog.vue     # Diálogo de detalle de cita
│   ├── BookingStatusChip.vue       # Chip de estado con color
│   ├── ServiceForm.vue             # Formulario de servicio
│   ├── ServiceCard.vue             # Tarjeta de servicio
│   ├── EmployeeForm.vue            # Formulario de empleado
│   ├── EmployeeSelect.vue          # Selector de empleado con disponibilidad
│   ├── ScheduleEditor.vue          # Editor visual de horarios
│   ├── ScheduleWeekGrid.vue        # Grid semanal de horarios
│   ├── TimeSlotPicker.vue          # Selector de slots disponibles
│   ├── HolidayCalendar.vue         # Calendario de excepciones/días festivos
│   └── CancelBookingDialog.vue     # Diálogo de cancelación
│
├── stores/
│   ├── booking.store.ts
│   ├── service.store.ts
│   ├── employee.store.ts
│   └── schedule.store.ts
│
├── composables/
│   ├── useBookingForm.ts
│   ├── useAvailability.ts
│   ├── useAgenda.ts
│   └── useScheduleGrid.ts
│
├── repositories/
│   ├── booking.repository.ts
│   ├── service.repository.ts
│   ├── employee.repository.ts
│   └── schedule.repository.ts
│
├── types/
│   ├── booking.types.ts
│   ├── service.types.ts
│   ├── employee.types.ts
│   └── schedule.types.ts
│
└── i18n/
    ├── en.json
    ├── es.json
    └── pt.json
```

---

## Flujos de Trabajo Principales

### Flujo 1: Configuración Inicial (Propietario/Admin)

```
Paso 1: Crear servicios
  1. Navegar a /appointments/services
  2. Click "Nuevo servicio"
  3. Completar formulario: nombre, descripción, duración, precio, color
  4. Guardar → servicio creado (is_active = true)

Paso 2: Crear empleados
  1. Navegar a /appointments/employees
  2. Click "Nuevo empleado" o "Invitar empleado"
  3. Si es invitación: se envía email con link de acceso
  4. Si es creación local: nombre, email, color
  5. Guardar → empleado creado

Paso 3: Asignar servicios a empleados
  1. En el formulario de empleado, sección "Servicios"
  2. Seleccionar qué servicios puede realizar
  3. Guardar

Paso 4: Configurar horarios
  1. Navegar a /appointments/schedules
  2. Configurar horario general del negocio (lunes a domingo)
  3. Configurar horarios específicos por empleado (opcional)
  4. Configurar descansos dentro de la jornada
  5. Marcar días festivos/cierres especiales

Paso 5: ¡El sistema está listo para recibir reservas!
```

### Flujo 2: Reserva Online (Cliente)

```
1. Cliente accede a: https://nexo.app/public/{slug}/booking
   o desde el sitio web del negocio (iframe o redirect)

2. Paso 1: Seleccionar servicio
   - Se muestran servicios activos con duración y precio
   - Cliente selecciona uno → se guarda en el store

3. Paso 2: Seleccionar empleado (opcional)
   - Se muestran empleados que realizan el servicio seleccionado
   - Si el negocio permite "cualquier empleado", opción "Automático"

4. Paso 3: Seleccionar fecha
   - Calendario que muestra solo fechas con disponibilidad
   - Fechas cerradas (festivos) aparecen tachadas

5. Paso 4: Seleccionar hora
   - Se muestran slots disponibles basados en:
     → Horario del empleado (o general)
     → Descansos
     → Citas existentes
     → Duración del servicio
   - Slots en intervalos de 30 minutos (configurable)

6. Paso 5: Datos del cliente
   - Nombre (obligatorio)
   - Email (obligatorio, para confirmación)
   - Teléfono (obligatorio)
   - Notas (opcional)

7. Confirmar reserva
   - Frontend valida datos
   - Llama a booking.repository.create()
   - RLS verifica tenant_id
   - Función de disponibilidad verifica que el slot sigue libre
   - Si ok: cita creada con estado "confirmed"
   - Si error (slot ocupado): mostrar error + sugerir siguiente slot disponible

8. Post-reserva:
   - Email de confirmación al cliente (Edge Function)
   - Notificación al negocio (panel + email)
   - La cita aparece en la agenda del empleado (Realtime)
```

### Flujo 3: Gestión de Cita (Empleado/Admin)

```
1. Empleado inicia sesión
2. Ve su agenda del día en /appointments/agenda
   - Las citas aparecen ordenadas por hora
   - Cada cita muestra: hora, cliente, servicio, estado

3. Acciones sobre la cita:
   a. Iniciar (cambiar a "in_progress"):
      - El empleado hace clic en "Iniciar"
      - Estado cambia a "in_progress"
      - Aparece en la pantalla del cliente como "En curso"

   b. Completar (cambiar a "completed"):
      - El empleado hace clic en "Completar"
      - Estado cambia a "completed"
      - Se registra visita en CRM del cliente
      - Se actualizan estadísticas del cliente

   c. No asistió (cambiar a "no_show"):
      - El empleado marca que el cliente no se presentó
      - Estado cambia a "no_show"
      - Se registra en el historial

   d. Cancelar (cambiar a "cancelled"):
      - Motivo de cancelación obligatorio
      - Si el cliente ya llegó, no se puede cancelar

4. La agenda se actualiza en tiempo real (Realtime)
```

### Flujo 4: Cancelación/Reprogramación (Cliente)

```
Cancelación:
1. Cliente recibe email de confirmación con link de cancelación
2. Hace clic en el link → /public/{slug}/cancel-booking/{token}
3. Frontend verifica el token:
   - Si faltan < 2h: mensaje "Ya no es posible cancelar"
   - Si ok: muestra confirmación + motivo (opcional)
4. Cliente confirma → cita marcada como "cancelled"
5. Email de cancelación al cliente
6. Notificación al negocio

Reprogramación:
1. Cliente recibe email de confirmación con link de reprogramación
2. Hace clic → /public/{slug}/reschedule-booking/{token}
3. Mismo flujo que reserva nueva, pero:
   - Datos del cliente precargados
   - Mismo servicio y empleado preseleccionados
4. Cliente selecciona nueva fecha y hora
5. Al confirmar:
   - Cita original se cancela (motivo: "reprogramada")
   - Nueva cita se crea con misma información
   - Se envía email de confirmación de la nueva cita
```

---

## Componentes Clave

### `BookingCalendar.vue`

El calendario es el componente central del módulo. Soporta tres vistas:

- **Vista Día**: Timeline horizontal de 6:00 a 22:00 (configurable). Cada fila es un empleado. Cada bloque es una cita.
- **Vista Semana**: 7 columnas (días) x empleados como filas.
- **Vista Mes**: Grid mensual con indicador de citas por día (cantidad).

```typescript
// Lógica del calendario
interface CalendarConfig {
  view: 'day' | 'week' | 'month';
  currentDate: Date;
  employees: Employee[];
  bookings: Booking[];
  startHour: number; // 6
  endHour: number; // 22
  slotDuration: number; // 30 minutes
}
```

### `TimeSlotPicker.vue`

Selector visual de slots disponibles. Muestra una grid de horarios con:

- **Verde**: Slot disponible
- **Gris**: Slot ocupado
- **Rojo**: Slot en conflicto con descanso
- **Azul**: Slot seleccionado

Se genera usando la función `get_available_slots()` de PostgreSQL.

### `ScheduleEditor.vue`

Editor visual de horarios. Muestra una semana tipo con:

- Grid de 7 días x 24 horas
- Arrastrar para seleccionar rangos
- Click para alternar disponible/no disponible
- Inline editing de horas de inicio y fin
- Sección de descansos dentro de la jornada
- Copiar horario de un día a otro

---

## Stores

### `booking.store.ts`

```typescript
export const useBookingStore = defineStore('appointments/bookings', () => {
  const bookings = ref<Booking[]>([]);
  const currentBooking = ref<Booking | null>(null);
  const loading = ref(false);
  const filters = reactive({
    date: new Date().toISOString().split('T')[0],
    employeeId: null as string | null,
    status: null as string | null,
  });

  // Getters
  const todayBookings = computed(() => bookings.value.filter((b) => b.date === filters.date));
  const pendingBookings = computed(() => bookings.value.filter((b) => b.status === 'confirmed'));

  // Actions
  async function fetchBookings() {
    loading.value = true;
    bookings.value = await bookingRepository.getByFilters(filters);
    loading.value = false;
  }

  async function createBooking(data: CreateBookingDTO) {
    return await bookingRepository.create(data);
  }

  async function updateStatus(id: string, status: string, reason?: string) {
    return await bookingRepository.updateStatus(id, status, reason);
  }

  return {
    bookings,
    currentBooking,
    loading,
    filters,
    todayBookings,
    pendingBookings,
    fetchBookings,
    createBooking,
    updateStatus,
  };
});
```

---

## Reglas de Negocio (Validación)

| Regla                                            | Dónde se valida | Implementación                                               |
| ------------------------------------------------ | --------------- | ------------------------------------------------------------ |
| No citas en el pasado                            | Frontend + DB   | Checkbox en formulario + `CHECK (date >= CURRENT_DATE)`      |
| No solapamiento de empleados                     | DB              | Función `get_available_slots()` verifica bookings existentes |
| No solapamiento de clientes                      | DB              | CHECK en trigger BEFORE INSERT                               |
| Cancelación < 2h antes                           | Frontend        | Comparación de fechas en el link de cancelación              |
| Duración mínima 5 min, max 480 min               | Frontend + DB   | `CHECK (duration_minutes >= 5 AND duration_minutes <= 480)`  |
| Precio ≥ 0                                       | Frontend + DB   | `CHECK (price >= 0)`                                         |
| Empleado debe tener al menos 1 servicio asignado | Frontend        | Validación al guardar empleado                               |
| Horario de empleado no excede horario general    | Frontend + DB   | Validación al guardar schedule                               |

---

## Integración con el Módulo CRM

| Evento en Citas             | Acción en CRM                                  |
| --------------------------- | ---------------------------------------------- |
| Cita completada             | Incrementar `total_visits` del cliente         |
| Nuevo cliente (reserva)     | Crear registro en `customers` si no existe     |
| Cliente existente (reserva) | Actualizar `last_visit_at`, `total_visits`     |
| Cancelación                 | Registrar en notas del cliente (si hay motivo) |

---

## Portal Público de Reservas

El portal público es una vista separada (`PublicBookingView.vue`) que:

1. **No requiere autenticación**: Cualquiera puede acceder.
2. **Muestra la marca del negocio**: Logo, colores, nombre desde el tenant.
3. **Sigue el wizard de 5 pasos**: Servicio → Empleado → Fecha → Hora → Datos.
4. **Completamente responsive**: Optimizado para móvil (la mayoría de los clientes reservan desde el teléfono).
5. **Multi-idioma**: El portal se muestra en el idioma del navegador del cliente o el configurado por el negocio.
6. **Google Analytics ready**: Eventos de conversión configurables.

### URL del Portal

```
Formato: https://nexo.app/public/{slug}/booking
Ejemplo: https://nexo.app/public/cafeteria-el-arabe/booking
```

El negocio puede:

- Compartir el link en redes sociales.
- Embedarlo en su sitio web como iframe.
- Redirigir desde su propio dominio.
- Personalizar el fondo, colores y logo desde la configuración del negocio.

---

## Edge Functions Relacionadas

| Función                          | Disparador                        | Propósito                                                            |
| -------------------------------- | --------------------------------- | -------------------------------------------------------------------- |
| `notify-appointment-reminder`    | Cron (cada hora)                  | Enviar recordatorios 24h antes de la cita                            |
| `send-booking-confirmation`      | AFTER INSERT en bookings          | Enviar email de confirmación con links de cancelación/reprogramación |
| `send-cancellation-notification` | AFTER UPDATE status → 'cancelled' | Notificar cancelación al negocio y cliente                           |
| `process-loyalty-points`         | AFTER UPDATE status → 'completed' | Acreditar puntos de fidelización al cliente                          |

---

## Testing del Módulo

| Tipo        | Qué probar                                         | Herramienta             |
| ----------- | -------------------------------------------------- | ----------------------- |
| Unitario    | Lógica de `get_available_slots()`                  | Vitest (SQL en memoria) |
| Unitario    | Stores: booking, service, employee, schedule       | Vitest + Pinia          |
| Unitario    | Composable: `useAvailability`                      | Vitest                  |
| Componentes | `BookingCalendar`, `TimeSlotPicker`, `BookingForm` | Vue Test Utils          |
| Integración | Flujo de reserva completo (frontend → RLS → DB)    | Playwright              |
| Integración | Aislamiento multi-tenant en bookings               | Playwright + Supabase   |
| E2E         | Usuario agenda, cancela, reprograma cita           | Playwright              |
| E2E         | Empleado cambia estado de cita                     | Playwright              |

---

## Decisiones Tomadas

| Decisión                      | Opción                        | Alternativas                   | Justificación                                                                                       |
| ----------------------------- | ----------------------------- | ------------------------------ | --------------------------------------------------------------------------------------------------- |
| Intervalo de slots            | 30 minutos                    | 15 min, 60 min                 | Balance entre flexibilidad y rendimiento. 30 min es el estándar en la industria.                    |
| Cancelación por link          | Token en URL                  | Login de cliente               | No requiere que el cliente tenga cuenta. Token único por cita.                                      |
| Reprogramación                | Cancelar + crear nueva        | Modificar fecha/hora existente | Más simple de implementar. Mantiene el historial limpio (cita original cancelada, nueva creada).    |
| Visualización de agenda       | Timeline horizontal           | Lista vertical                 | Timeline muestra mejor la ocupación del día y los espacios libres.                                  |
| Disponibilidad en tiempo real | Consulta a DB en cada request | Caché con Redis                | La disponibilidad cambia constantemente (nuevas reservas). Caché causaría errores de doble reserva. |

---

## Posibles Mejoras Futuras

- **Citas recurrentes**: El cliente puede agendar una cita que se repite semanal/mensualmente.
- **Auto-check-in**: El cliente escanea un QR al llegar y se marca automáticamente como "en curso".
- **Lista de espera**: Si no hay disponibilidad, el cliente se apunta a una lista y se le notifica si se libera un slot.
- **Recordatorio por SMS**: Además del email, recordatorio SMS (con costo adicional).
- **Google Calendar sync**: Sincronizar citas con Google Calendar del empleado.
- **Múltiples sucursales**: Un mismo negocio con varias ubicaciones, cada una con sus propios servicios y empleados.
- **Reserva de recursos**: Además de empleados, reservar salas, equipos o instalaciones.
- **Pago online**: Cobrar al cliente al reservar (seña o pago completo).
- **Inteligencia artificial**: Sugerir horarios óptimos basados en el historial del cliente.

---

_Documento generado el: 04/07/2026_
_Versión: 1.0_
_Próximo documento: 14-module-digital-menu.md_
