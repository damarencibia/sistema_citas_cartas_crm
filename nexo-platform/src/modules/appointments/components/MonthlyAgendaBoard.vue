<template>
  <div class="mab">
    <!-- ═══ Calendario del mes ═══ -->
    <section class="mab__cal">
      <header class="mab__header">
        <button
          type="button"
          class="mab__year"
          :aria-label="`Ir al año ${prevYear}`"
          @click="emit('prev-year')"
        >
          {{ prevYear }}
        </button>
        <h2 class="mab__title">{{ titleLabel }}</h2>
        <button
          type="button"
          class="mab__year"
          :aria-label="`Ir al año ${nextYear}`"
          @click="emit('next-year')"
        >
          {{ nextYear }}
        </button>
      </header>

      <div class="mab__toolbar">
        <v-btn
          v-if="!isCurrentMonth"
          variant="text"
          size="small"
          class="mab__today text-none"
          @click="emit('today')"
        >
          Hoy
        </v-btn>
        <v-spacer />
        <div class="mab__nav-inline">
          <v-btn
            icon
            size="small"
            variant="text"
            aria-label="Mes anterior"
            @click="emit('prev-month')"
          >
            <v-icon size="18">mdi-chevron-left</v-icon>
          </v-btn>
          <v-btn
            icon
            size="small"
            variant="text"
            aria-label="Mes siguiente"
            @click="emit('next-month')"
          >
            <v-icon size="18">mdi-chevron-right</v-icon>
          </v-btn>
        </div>
        <v-menu
          v-model="pickerMenu"
          :close-on-content-click="false"
          location="bottom end"
          offset="6"
        >
          <template #activator="{ props: menuProps }">
            <v-btn
              v-bind="menuProps"
              variant="outlined"
              size="small"
              rounded="md"
              class="mab__pick-btn text-none"
            >
              <v-icon start size="16" color="primary">mdi-calendar-blank</v-icon>
              Elegir fecha
            </v-btn>
          </template>
          <div class="mab__picker">
            <v-date-picker
              :model-value="pickerValue"
              color="primary"
              first-day-of-week="1"
              show-adjacent-months
              hide-weekdays
              @update:model-value="onPickerPick"
            />
          </div>
        </v-menu>
      </div>

      <div class="mab__weekdays" aria-hidden="true">
        <span v-for="label in WEEKDAYS" :key="label">{{ label }}</span>
      </div>

      <div v-if="loading" class="mab__grid mab__grid--skeleton" aria-busy="true">
        <div v-for="i in 42" :key="`sk-${i}`" class="mab__skeleton" />
      </div>

      <div v-else class="mab__gridwrap">
        <button
          type="button"
          class="mab__arrow mab__arrow--left"
          aria-label="Mes anterior"
          @click="emit('prev-month')"
        >
          <v-icon size="20">mdi-chevron-left</v-icon>
        </button>
        <button
          type="button"
          class="mab__arrow mab__arrow--right"
          aria-label="Mes siguiente"
          @click="emit('next-month')"
        >
          <v-icon size="20">mdi-chevron-right</v-icon>
        </button>

        <div class="mab__grid" role="grid" :aria-label="`Calendario de ${titleLabel}`">
          <div
            v-for="(week, w) in weeks"
            :key="`w-${w}`"
            class="mab__week"
            role="row"
          >
            <div
              v-for="day in week"
              :key="day.date"
              role="gridcell"
              class="mab__cell"
              :aria-selected="day.inMonth ? day.isSelected : undefined"
            >
              <button
                type="button"
                class="mab__day"
                :class="{
                  'mab__day--selected': day.isSelected,
                  'mab__day--today': day.isToday && !day.isSelected,
                  'mab__day--outside': !day.inMonth,
                  'mab__day--marked': day.inMonth && day.total > 0,
                }"
                :disabled="!day.inMonth"
                :aria-label="dayAria(day)"
                @click="onPickDay(day)"
              >
                <span class="mab__daynum">{{ day.dayNumber }}</span>
                <span v-if="day.inMonth && day.total > 0" class="mab__daymarks" aria-hidden="true">
                  <span class="mab__daycount">{{ day.total }}</span>
                  <v-icon v-if="day.isClosed" size="10" class="mab__mark mab__mark--closed">
                    mdi-check-decagram
                  </v-icon>
                  <span v-else-if="day.pendingClosure" class="mab__mark mab__mark--pending" />
                  <span v-if="day.pendingApproval > 0" class="mab__mark mab__mark--approval" />
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══ Panel del día: administración de reservas ═══ -->
    <aside class="mab__panel" aria-label="Reservas del día seleccionado">
      <template v-if="selectedDay">
        <div class="mab__panel-head">
          <span class="mab__panel-eyebrow">Día seleccionado</span>
          <div class="mab__panel-title">{{ selectedDayLong }}</div>
          <div class="mab__panel-meta">
            {{ selectedDay.total }} {{ selectedDay.total === 1 ? 'reserva' : 'reservas' }}
            · {{ selectedDay.attended }} {{ selectedDay.attended === 1 ? 'atendida' : 'atendidas' }}
          </div>
          <div class="mab__panel-seals">
            <span v-if="selectedDay.isClosed" class="mab__seal mab__seal--success">
              Cierre registrado
            </span>
            <span v-else-if="selectedDay.pendingClosure" class="mab__seal mab__seal--warning">
              Pendiente de cierre
            </span>
            <span v-else-if="selectedDay.isFuture" class="mab__seal">Día futuro</span>
          </div>
        </div>

        <div class="mab__panel-list">
          <button
            v-for="booking in selectedBookings"
            :key="booking.id"
            type="button"
            class="mab__booking"
            :class="{ 'mab__booking--cancelled': booking.status === 'cancelled' }"
            @click="emit('open-booking', booking)"
          >
            <span class="mab__booking__time">{{ timeOf(booking) }}</span>
            <span class="mab__booking__main">
              <span class="mab__booking__name">{{ booking.customer_name || 'Cliente' }}</span>
              <span class="mab__booking__meta">
                {{ booking.service?.name || 'Servicio' }}
                <template v-if="employeeOf(booking)"> · {{ employeeOf(booking) }}</template>
              </span>
            </span>
            <span class="mab__chip" :class="`mab__chip--${toneOf(booking)}`">
              {{ labelOf(booking) }}
            </span>
          </button>

          <p v-if="selectedBookings.length === 0" class="mab__panel-empty">
            Sin reservas para este día.
          </p>

          <div v-if="blockedSlots && blockedSlots.length > 0" class="mab__blocks">
            <span class="mab__panel-eyebrow">Horarios bloqueados</span>
            <div v-for="block in blockedSlots" :key="block.id" class="mab__block">
              <v-icon size="14" class="mab__block__icon" aria-hidden="true">mdi-lock-outline</v-icon>
              <span class="mab__block__time">
                {{ block.start_time?.slice(0, 5) }}–{{ block.end_time?.slice(0, 5) }}
              </span>
              <span class="mab__block__reason">{{ block.reason || 'Bloqueo manual' }}</span>
              <button
                type="button"
                class="mab__block__release"
                :aria-label="`Liberar bloqueo de ${block.start_time?.slice(0, 5)}`"
                @click="emit('open-block', block)"
              >
                Liberar
              </button>
            </div>
          </div>
        </div>

        <div class="mab__panel-actions">
          <button
            v-if="selectedDay.pendingClosure && canClose"
            type="button"
            class="mab__cta"
            @click="emit('open-closure')"
          >
            <lord-icon
              class="mab__cta-icon"
              src="/animations/clipboard-text-reveal.json"
              state="in-reveal"
              trigger="loop(1500)"
              speed="1.5"
              loading="lazy"
              current-color
              @ready="onIconReady"
            />
            <span>Cerrar el día</span>
          </button>
          <v-btn
            v-else-if="selectedDay.isClosed"
            variant="tonal"
            color="success"
            rounded="md"
            block
            class="mab__panel-btn"
            @click="emit('open-closure')"
          >
            Ver el cierre
          </v-btn>

          <button
            v-if="selectedDay.pendingApproval > 0"
            type="button"
            class="mab__approval"
            @click="emit('go-approval')"
          >
            <v-icon size="14" aria-hidden="true">mdi-clock-alert-outline</v-icon>
            <span class="mab__approval__text">
              {{ selectedDay.pendingApproval }}
              {{ selectedDay.pendingApproval === 1 ? 'pendiente' : 'pendientes' }} de aprobación
            </span>
            <v-icon size="14" aria-hidden="true">mdi-chevron-right</v-icon>
          </button>

          <p v-if="selectedDay.pendingClosure && !canClose" class="mab__panel-hint">
            Seleccioná un empleado para operar el cierre.
          </p>
        </div>
      </template>

      <div v-else class="mab__panel-empty-state">
        <v-icon size="36" aria-hidden="true">mdi-calendar-month-outline</v-icon>
        <p class="mab__panel-empty">Elegí un día del calendario para ver sus reservas.</p>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { format as fmt } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Booking, BlockedSlot } from '../types/booking.types';

const WEEKDAYS = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];
const CLOSURE_CUTOFF_HOUR = 19;

const props = defineProps<{
  /** ISO del día ancla del mes visible */
  monthAnchor: string;
  /** Grilla completa del mes (incluye días de meses vecinos, lunes primero) */
  dates: string[];
  bookings: Booking[];
  /** Fechas del mes con cierre vigente */
  closedDates?: string[];
  selectedDate: string | null;
  loading: boolean;
  /** Nombres por id de empleado (para la meta de cada reserva) */
  employeeNames?: Record<string, string>;
  /** Bloqueos de horario del día seleccionado (ya cargados por AgendaView) */
  blockedSlots?: BlockedSlot[];
  /** Hay empleado seleccionado: se puede operar el cierre */
  canClose?: boolean;
}>();

const emit = defineEmits<{
  'select-date': [date: string];
  'prev-month': [];
  'next-month': [];
  'prev-year': [];
  'next-year': [];
  today: [];
  'open-booking': [booking: Booking];
  'open-block': [block: BlockedSlot];
  'open-closure': [];
  'go-approval': [];
}>();

const pickerMenu = ref(false);

// ─── Helpers de fecha ───────────────────────────────────────
const todayIso = computed(() => new Date().toISOString().split('T')[0]);
const anchorDate = computed(() => new Date(`${props.monthAnchor}T12:00:00`));
const today = computed(() => new Date());

const prevYear = computed(() => anchorDate.value.getFullYear() - 1);
const nextYear = computed(() => anchorDate.value.getFullYear() + 1);

const titleLabel = computed(() =>
  fmt(anchorDate.value, 'MMMM yyyy', { locale: es }).toUpperCase(),
);

function isSameMonth(date: Date) {
  return (
    date.getFullYear() === anchorDate.value.getFullYear()
    && date.getMonth() === anchorDate.value.getMonth()
  );
}

const isCurrentMonth = computed(() => isSameMonth(today.value));

function toIsoDateWithTime(date: string) {
  return new Date(`${date}T12:00:00`);
}

// ─── Datos del día ──────────────────────────────────────────
const closedSet = computed(() => new Set(props.closedDates ?? []));

const bookingsByDate = computed(() => {
  const map: Record<string, Booking[]> = {};
  for (const booking of props.bookings) {
    if (!booking.date) continue;
    (map[booking.date] ??= []).push(booking);
  }
  return map;
});

const days = computed(() =>
  props.dates.map((date) => {
    const list = bookingsByDate.value[date] ?? [];
    const d = toIsoDateWithTime(date);
    const isClosed = closedSet.value.has(date);
    const isPast = date < todayIso.value;
    const isFuture = date > todayIso.value;
    let pendingClosure = false;
    if (date === todayIso.value) {
      pendingClosure = !isClosed && today.value.getHours() >= CLOSURE_CUTOFF_HOUR && list.length > 0;
    } else if (isPast) {
      pendingClosure = !isClosed && list.length > 0;
    }
    const pendingApproval = list.filter((b) => b.status === 'pending_approval').length;

    return {
      date,
      dayNumber: d.getDate(),
      inMonth: isSameMonth(d),
      isToday: date === todayIso.value,
      isPast,
      isFuture,
      isSelected: date === props.selectedDate,
      isClosed,
      pendingClosure,
      pendingApproval,
      total: list.length,
      attended: list.filter((b) => b.status === 'completed').length,
    };
  }),
);

const weeks = computed(() => {
  const chunks: (typeof days.value)[] = [];
  for (let i = 0; i < days.value.length; i += 7) {
    chunks.push(days.value.slice(i, i + 7));
  }
  return chunks;
});

const selectedDay = computed(
  () => days.value.find((d) => d.date === props.selectedDate) ?? null,
);

const selectedBookings = computed(() => {
  const date = props.selectedDate;
  if (!date) return [];
  return [...(bookingsByDate.value[date] ?? [])].sort((a, b) =>
    (a.start_time ?? '').localeCompare(b.start_time ?? ''),
  );
});

const selectedDayLong = computed(() => {
  if (!props.selectedDate) return '';
  const label = fmt(toIsoDateWithTime(props.selectedDate), "EEEE d 'de' MMMM", { locale: es });
  return label.charAt(0).toUpperCase() + label.slice(1);
});

function dayAria(day: (typeof days.value)[number]) {
  const base = fmt(toIsoDateWithTime(day.date), "EEEE d 'de' MMMM", { locale: es });
  const parts = [base];
  if (day.total > 0) parts.push(`${day.total} ${day.total === 1 ? 'reserva' : 'reservas'}`);
  if (day.pendingApproval > 0) parts.push(`${day.pendingApproval} pendientes de aprobación`);
  if (day.isClosed) parts.push('día cerrado');
  else if (day.pendingClosure) parts.push('pendiente de cierre');
  return parts.join(', ');
}

function onPickDay(day: (typeof days.value)[number]) {
  if (!day.inMonth) return;
  emit('select-date', day.date);
}

// ─── Presentación de reservas ───────────────────────────────
function timeOf(booking: Booking) {
  return booking.start_time?.slice(0, 5) ?? '—';
}

function employeeOf(booking: Booking) {
  return booking.employee_id ? props.employeeNames?.[booking.employee_id] : null;
}

const STATUS_TONE: Record<string, string> = {
  confirmed: 'success',
  in_progress: 'info',
  completed: 'neutral',
  no_show: 'error',
  cancelled: 'error',
  pending_approval: 'warning',
};

const STATUS_LABEL: Record<string, string> = {
  confirmed: 'Confirmada',
  in_progress: 'En curso',
  completed: 'Atendida',
  no_show: 'No asistió',
  cancelled: 'Cancelada',
  pending_approval: 'Por aprobar',
};

function toneOf(booking: Booking) {
  return STATUS_TONE[booking.status ?? ''] ?? 'neutral';
}

function labelOf(booking: Booking) {
  return STATUS_LABEL[booking.status ?? ''] ?? booking.status ?? '';
}

// ─── Date picker ────────────────────────────────────────────
const pickerValue = computed(() =>
  props.selectedDate ? toIsoDateWithTime(props.selectedDate) : new Date(),
);

function onPickerPick(value: unknown) {
  const d = Array.isArray(value) ? (value[0] as Date) : (value as Date);
  if (!d) return;
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  emit('select-date', iso);
}

watch(() => props.monthAnchor, () => {
  pickerMenu.value = false;
});

// ─── Lordicon del CTA de cierre (mismo player que el calendario) ──
let ensureLordiconOnce: Promise<void> | null = null;
function ensureLordicon(): Promise<void> {
  ensureLordiconOnce ??= import('@lordicon/element').then((m) => m.defineElement());
  return ensureLordiconOnce;
}

void ensureLordicon();

/** Con movimiento reducido el loop deja el icono en el frame 0: fijarlo al final */
function onIconReady(event: Event) {
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const icon = event.currentTarget as (HTMLElement & { seek?: (target: string) => void }) | null;
  try {
    icon?.seek?.('end');
  } catch {
    /* noop */
  }
}
</script>

<style scoped>
.mab {
  --hairline: rgb(var(--v-theme-on-surface), 0.12);
  display: flex;
  align-items: stretch;
  min-height: 460px;
  border: 1px solid var(--hairline);
  border-radius: 8px;
  overflow: hidden;
  background: rgb(var(--v-theme-surface));
}

/* ═══ Calendario ═══ */
.mab__cal {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  padding: 22px 52px 24px;
}

.mab__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 6px;
}

.mab__year {
  min-height: 32px;
  padding: 4px 8px;
  border: 0;
  background: transparent;
  color: rgb(var(--v-theme-primary));
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  border-radius: 4px;
}

.mab__year:not(:disabled):active {
  background: rgb(var(--v-theme-primary), 0.08);
}

.mab__title {
  margin: 0;
  font-size: 18px;
  line-height: 1.3;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  text-align: center;
  color: rgb(var(--v-theme-on-surface));
}

.mab__toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
}

.mab__today.v-btn {
  color: rgb(var(--v-theme-on-surface), 0.65);
}

.mab__nav-inline {
  display: none;
}

.mab__pick-btn.v-btn {
  min-height: 36px;
}

.mab__weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px 8px;
  margin-bottom: 10px;
  text-align: center;
}

.mab__weekdays span {
  font-size: 10px;
  line-height: 1.4;
  font-weight: 700;
  letter-spacing: 0.14em;
  color: rgb(var(--v-theme-on-surface), 0.5);
}

.mab__gridwrap {
  position: relative;
  flex: 1 1 auto;
  display: flex;
  align-items: center;
}

.mab__grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px 8px;
  width: 100%;
  align-content: center;
}

.mab__week {
  display: contents;
}

.mab__cell {
  display: flex;
  align-items: center;
  justify-content: center;
}

.mab__day {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  width: 100%;
  min-height: 50px;
  padding: 4px 2px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: rgb(var(--v-theme-on-surface));
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.mab__day:disabled {
  cursor: default;
}

.mab__day:not(:disabled):active {
  background: rgb(var(--v-theme-primary), 0.12);
}

.mab__day--outside {
  opacity: 0.32;
}

.mab__daynum {
  min-width: 28px;
  height: 28px;
  padding: 0 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 13px;
  line-height: 1;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

/* Días con reservas: subrayado punteado (señal no dependiente del color) */
.mab__day--marked:not(.mab__day--selected) .mab__daynum {
  text-decoration: underline dotted;
  text-decoration-color: rgb(var(--v-theme-primary), 0.75);
  text-underline-offset: 4px;
}

/* Hoy */
.mab__day--today .mab__daynum {
  box-shadow: inset 0 0 0 1px rgb(var(--v-theme-primary), 0.7);
  font-weight: 700;
}

/* Seleccionado: círculo sólido */
.mab__day--selected .mab__daynum {
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
  font-weight: 700;
  text-decoration: none;
}

.mab__daymarks {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  min-height: 12px;
}

.mab__daycount {
  font-size: 9px;
  line-height: 1;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: rgb(var(--v-theme-on-surface), 0.55);
}

.mab__day--selected .mab__daycount {
  color: rgb(var(--v-theme-on-surface), 0.75);
}

.mab__mark {
  font-size: 10px;
}

.mab__mark--closed {
  color: rgb(var(--v-theme-success));
}

.mab__mark--pending {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: rgb(var(--v-theme-warning));
}

.mab__mark--approval {
  width: 5px;
  height: 5px;
  border-radius: 1px;
  transform: rotate(45deg);
  background: rgb(var(--v-theme-info));
}

/* Flechas circulares */
.mab__arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 1;
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 50%;
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
  cursor: pointer;
  transition: transform 0.15s ease, filter 0.15s ease;
}

.mab__arrow--left {
  left: 0;
}

.mab__arrow--right {
  right: 0;
}

.mab__arrow:not(:disabled):active {
  transform: translateY(-50%) scale(0.94);
}

/* Skeleton */
.mab__grid--skeleton {
  flex: 1 1 auto;
  align-content: center;
}

.mab__skeleton {
  height: 44px;
  border-radius: 6px;
  background: rgb(var(--v-theme-on-surface), 0.06);
}

/* Picker */
.mab__picker {
  padding: 12px;
  border: 1px solid var(--hairline);
  border-radius: 8px;
  background: rgb(var(--v-theme-surface));
  box-shadow: 0 8px 24px rgb(0 0 0 / 0.12);
}

/* ═══ Panel del día ═══ */
.mab__panel {
  --panel-hairline: rgb(var(--v-theme-surface), 0.14);
  --panel-soft: rgb(var(--v-theme-surface), 0.62);
  --panel-faint: rgb(var(--v-theme-surface), 0.4);
  --panel-hover: rgb(var(--v-theme-surface), 0.07);
  flex: 0 0 285px;
  width: 285px;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 24px 20px 18px;
  border-left: 1px solid rgb(var(--v-theme-on-surface), 0.12);
  background: rgb(var(--v-theme-on-surface));
  color: rgb(var(--v-theme-surface));
}

.v-theme--dark .mab__panel {
  --panel-hairline: rgb(var(--v-theme-on-surface), 0.14);
  --panel-soft: rgb(var(--v-theme-on-surface), 0.62);
  --panel-faint: rgb(var(--v-theme-on-surface), 0.42);
  --panel-hover: rgb(var(--v-theme-on-surface), 0.07);
  border-left-color: rgb(var(--v-theme-on-surface), 0.1);
  background: rgb(var(--v-theme-surface-variant));
  color: rgb(var(--v-theme-on-surface));
}

.mab__panel-head {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--panel-hairline);
}

.mab__panel-eyebrow {
  font-size: 9px;
  line-height: 1.4;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--panel-faint);
}

.mab__panel-title {
  font-size: 15px;
  line-height: 1.3;
  font-weight: 700;
  color: currentColor;
}

.mab__panel-meta {
  font-size: 11px;
  line-height: 1.4;
  font-variant-numeric: tabular-nums;
  color: var(--panel-soft);
}

.mab__panel-seals {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding-top: 4px;
}

.mab__seal {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border: 1px solid var(--panel-hairline);
  border-radius: 4px;
  font-size: 9px;
  line-height: 1.4;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--panel-soft);
}

.mab__seal--success {
  border-color: rgb(var(--v-theme-success), 0.5);
  background: rgb(var(--v-theme-success), 0.12);
  color: rgb(var(--v-theme-success));
}

.mab__seal--warning {
  border-color: rgb(var(--v-theme-warning), 0.5);
  background: rgb(var(--v-theme-warning), 0.12);
  color: rgb(var(--v-theme-warning));
}

.mab__panel-list {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: none;
  padding: 4px 0;
}

.mab__panel-list::-webkit-scrollbar {
  display: none;
}

/* Reserva: fila táctil */
.mab__booking {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  width: 100%;
  min-height: 44px;
  padding: 9px 8px;
  border: 0;
  border-bottom: 1px solid var(--panel-hairline);
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.15s ease;
}

.mab__booking:last-child {
  border-bottom: 0;
}

.mab__booking:active {
  background: var(--panel-hover);
}

.mab__booking--cancelled {
  opacity: 0.5;
}

.mab__booking__time {
  flex-shrink: 0;
  padding-top: 1px;
  font-size: 11px;
  line-height: 1.4;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: currentColor;
}

.mab__booking__main {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.mab__booking__name {
  font-size: 12px;
  line-height: 1.35;
  font-weight: 600;
  color: currentColor;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mab__booking__meta {
  font-size: 10px;
  line-height: 1.4;
  color: var(--panel-soft);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mab__chip {
  flex-shrink: 0;
  padding: 1px 6px;
  border: 1px solid var(--panel-hairline);
  border-radius: 3px;
  font-size: 8.5px;
  line-height: 1.5;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--panel-soft);
}

.mab__chip--success {
  border-color: rgb(var(--v-theme-success), 0.5);
  color: rgb(var(--v-theme-success));
}

.mab__chip--info {
  border-color: rgb(var(--v-theme-info), 0.5);
  color: rgb(var(--v-theme-info));
}

.mab__chip--warning {
  border-color: rgb(var(--v-theme-warning), 0.5);
  color: rgb(var(--v-theme-warning));
}

.mab__chip--error {
  border-color: rgb(var(--v-theme-error), 0.5);
  color: rgb(var(--v-theme-error));
}

.mab__panel-empty {
  margin: 0;
  padding: 18px 4px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--panel-soft);
}

/* Bloqueos del día: liberación directa */
.mab__blocks {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 0 4px;
  border-top: 1px solid var(--panel-hairline);
  margin-top: 6px;
}

.mab__block {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  font-size: 10px;
  line-height: 1.4;
  color: var(--panel-soft);
}

.mab__block__icon {
  flex-shrink: 0;
  color: var(--panel-faint);
}

.mab__block__time {
  flex-shrink: 0;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: currentColor;
}

.mab__block__reason {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mab__block__release {
  flex-shrink: 0;
  min-height: 32px;
  padding: 4px 8px;
  border: 1px solid var(--panel-hairline);
  border-radius: 4px;
  background: transparent;
  color: var(--panel-soft);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
}

.mab__block__release:active {
  background: var(--panel-hover);
}

.mab__panel-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid var(--panel-hairline);
}

/* CTA de cierre: cápsula tonal success de 52px */
.mab__cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  min-height: 52px;
  padding: 0 16px;
  border: 1px solid rgb(var(--v-theme-success), 0.45);
  border-radius: 999px;
  background: rgb(var(--v-theme-success), 0.12);
  color: rgb(var(--v-theme-success));
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.mab__cta:active {
  background: rgb(var(--v-theme-success), 0.2);
}

.mab__cta-icon {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
}

.mab__panel-btn.v-btn {
  min-height: 44px;
}

.mab__approval {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 40px;
  padding: 6px 8px;
  border: 1px dashed rgb(var(--v-theme-warning), 0.5);
  border-radius: 4px;
  background: transparent;
  color: rgb(var(--v-theme-warning));
  font-size: 11px;
  line-height: 1.4;
  text-align: left;
  cursor: pointer;
}

.mab__approval__text {
  flex: 1 1 auto;
  min-width: 0;
}

.mab__panel-hint {
  margin: 0;
  font-size: 10px;
  line-height: 1.45;
  color: var(--panel-faint);
}

.mab__panel-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  flex: 1 1 auto;
  text-align: center;
  color: var(--panel-soft);
}

.mab__panel-empty-state .mab__panel-empty {
  max-width: 200px;
  padding: 0;
}

/* ═══ Responsive ═══ */
@media (max-width: 900px) {
  .mab {
    flex-direction: column;
    min-height: 0;
  }

  .mab__cal {
    padding: 18px 16px 20px;
  }

  .mab__gridwrap {
    padding: 0 2px;
  }

  .mab__arrow {
    display: none;
  }

  .mab__nav-inline {
    display: inline-flex;
  }

  .mab__panel {
    flex: 0 0 auto;
    width: 100%;
    min-height: 220px;
    border-left: 0;
    border-top: 1px solid rgb(var(--v-theme-on-surface), 0.12);
    border-radius: 0 0 8px 8px;
  }

  .mab__panel-list {
    max-height: 280px;
  }
}

@media (max-width: 699px) {
  .mab__cal {
    padding: 14px 10px 16px;
  }

  .mab__title {
    font-size: 16px;
    letter-spacing: 0.04em;
  }

  .mab__weekdays {
    gap: 2px 4px;
  }

  .mab__grid {
    gap: 2px 4px;
  }

  .mab__day {
    min-height: 44px;
    padding: 2px 0;
  }

  .mab__daynum {
    min-width: 26px;
    height: 26px;
  }

  .mab__daycount {
    font-size: 8px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .mab__day,
  .mab__booking,
  .mab__arrow,
  .mab__cta {
    transition: none;
  }

  .mab__arrow:not(:disabled):active {
    transform: translateY(-50%);
  }
}
</style>
