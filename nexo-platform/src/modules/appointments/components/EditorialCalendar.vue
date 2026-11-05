<template>
  <div class="ec">
    <!-- ─── Cabecera: navegación de semana · título · selector de fecha ─── -->
    <div class="ec__header d-flex align-center ga-2 mb-4">
      <div class="ec__nav d-flex align-center ga-1">
        <v-btn
          icon
          size="small"
          variant="text"
          aria-label="Semana anterior"
          class="ec__nav-btn"
          @click="emit('prev-week')"
        >
          <v-icon size="18">mdi-chevron-left</v-icon>
        </v-btn>
        <span class="ec__range">{{ rangeLabel }}</span>
        <v-btn
          icon
          size="small"
          variant="text"
          aria-label="Semana siguiente"
          class="ec__nav-btn"
          @click="emit('next-week')"
        >
          <v-icon size="18">mdi-chevron-right</v-icon>
        </v-btn>
        <v-btn
          v-if="!isCurrentWeek"
          variant="text"
          size="small"
          density="comfortable"
          class="ec__today-btn text-none"
          @click="emit('today')"
        >
          Hoy
        </v-btn>
      </div>

      <v-spacer />

      <h2 class="ec__title">{{ monthTitle }}</h2>

      <v-spacer />

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
            class="ec__pick-btn text-none"
          >
            <v-icon start size="16" color="primary">mdi-calendar-blank</v-icon>
            Elegir Fecha
            <v-icon end size="16">mdi-chevron-down</v-icon>
          </v-btn>
        </template>
        <div class="ec__picker">
          <div class="ec__picker-header">{{ pickerMonthLabel }}</div>
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

    <!-- ─── Skeleton de carga ─── -->
    <div v-if="loading" class="ec__grid ec__grid--skeleton">
      <div v-for="i in weekDates.length" :key="`sk-${i}`" class="ec__col">
        <v-skeleton-loader
          type="text"
          boilerplate
          class="mx-auto my-2"
          width="56"
        />
        <v-skeleton-loader type="heading, text, text, text" class="px-2 py-3" />
      </div>
    </div>

    <!-- ─── Columnas ─── -->
    <div v-else ref="scrollRef" class="ec__scroll">
      <div class="ec__grid">
        <div
          v-for="col in columns"
          :key="col.date"
          class="ec__col"
          :class="{
            'ec__col--active': col.isSelected,
            'ec__col--today': col.isToday && !col.isSelected,
            'ec__col--sealed': col.isSelected && dayClosed,
            'ec__col--clickable': true,
          }"
        >
          <span aria-hidden="true" class="ec__sweep" />
          <!-- Encabezado del día -->
          <button
            type="button"
            class="ec__day-head"
            :aria-label="`Ver ${formatLong(col.date)}`"
            @click="emit('select-date', col.date)"
          >
            <span class="ec__weekday">{{ col.weekday }}</span>
            <span class="ec__daynum">{{ col.dayNumber }}</span>
            <span v-if="col.isToday && !col.isSelected" class="ec__today-dot" />
          </button>

          <!-- Bloques del día -->
          <div v-if="col.events.length > 0" class="ec__events">
            <template v-for="(event, i) in col.events" :key="event.id">
              <button
                v-if="event.type === 'booking'"
                type="button"
                class="ec__event"
                :class="eventClass(event.booking.status)"
                @click="emit('open-booking', event.booking)"
              >
                <span class="ec__event-time">{{ event.booking.start_time.slice(0, 5) }}</span>
                <span class="ec__event-title">
                  {{ event.booking.service?.name ?? 'Servicio' }}
                  <span class="ec__event-customer">
                    · {{ event.booking.customer_name || 'Cliente' }}
                  </span>
                </span>
                <span class="ec__event-meta">
                  <v-icon size="11" class="mr-1">mdi-account-outline</v-icon>
                  {{ employeeFirstName(event.booking.employee_id) }}
                  <template v-if="durationOf(event.booking)">
                    · {{ durationOf(event.booking) }} min
                  </template>
                  <v-icon v-if="event.booking.status === 'completed'" size="11" class="ml-1">
                    mdi-check
                  </v-icon>
                  <v-icon v-else-if="event.booking.status === 'pending_approval'" size="11" class="ml-1">
                    mdi-clock-alert-outline
                  </v-icon>
                </span>
              </button>
              <button
                v-else
                type="button"
                class="ec__event ec__event--blocked"
                :title="`Horario bloqueado: ${event.block.reason || 'Bloqueo manual'}`"
                @click="emit('open-block', event.block)"
              >
                <span class="ec__event-time">{{ event.block.start_time.slice(0, 5) }}</span>
                <span class="ec__event-title">Bloqueado</span>
                <span class="ec__event-meta">
                  <v-icon size="11" class="mr-1">mdi-lock-outline</v-icon>
                  {{ event.block.reason || 'Bloqueo manual' }}
                </span>
              </button>
              <div v-if="i < col.events.length - 1" class="ec__event-sep" />
            </template>
          </div>

          <div v-else class="ec__empty">
            <span>—</span>
          </div>

          <!-- Ficha de cierre / sello del día seleccionado -->
          <div v-if="col.isSelected" class="ec__closure">
            <button
              v-if="dayClosed"
              type="button"
              class="ec__stamp"
              title="Ver el resumen del cierre del día"
              @click="emit('open-closure')"
            >
              <span class="ec__stamp-label">Día Cerrado</span>
              <span class="ec__stamp-meta">
                <v-icon size="12">mdi-check-decagram</v-icon>
                {{ closureDateLabel }}
              </span>
            </button>
            <button
              v-else-if="canClose"
              type="button"
              class="ec__closure-tile"
              :title="`Abrir el cierre del día ${closureDateLabel}`"
              @click="emit('open-closure')"
            >
              <span class="ec__closure-label">Cerrar Día — {{ closureDateLabel }}</span>
              <span class="ec__closure-stats">{{ closureStats }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { format as fmt } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Booking, BlockedSlot } from '../types/booking.types';

type CalendarEvent =
  | { id: string; type: 'booking'; booking: Booking; start: string }
  | { id: string; type: 'block'; block: BlockedSlot; start: string };

const props = defineProps<{
  weekDates: string[];
  weekBookings: Booking[];
  /** Bloqueos del día seleccionado por empleado (ya cargados por AgendaView) */
  blockedSlots: BlockedSlot[];
  selectedDate: string | null;
  loading: boolean;
  /** Nombres por id de empleado para la meta de cada bloque */
  employeeNames: Record<string, string>;
  /** El día seleccionado ya tiene cierre registrado */
  dayClosed?: boolean;
  /** Puede operar el cierre (hay empleado seleccionado) */
  canClose?: boolean;
}>();

const emit = defineEmits<{
  'select-date': [date: string];
  'prev-week': [];
  'next-week': [];
  today: [];
  'open-booking': [booking: Booking];
  'open-block': [block: BlockedSlot];
  'open-closure': [];
}>();

const pickerMenu = ref(false);

// ─── Columnas ───────────────────────────────────────────────
const columns = computed(() => {
  const todayIso = new Date().toISOString().split('T')[0];
  return props.weekDates.map((date) => {
    const bookings: Booking[] = props.weekBookings
      .filter((b) => b.date === date)
      .sort((a, b) => (a.start_time ?? '').localeCompare(b.start_time ?? ''));

    const blocks: BlockedSlot[] =
      date === props.selectedDate
        ? props.blockedSlots
        : [];

    const events: CalendarEvent[] = [
      ...bookings.map((b) => ({
        id: `b-${b.id}`,
        type: 'booking' as const,
        booking: b,
        start: b.start_time ?? '',
      })),
      ...blocks.map((blk) => ({
        id: `block-${blk.id}`,
        type: 'block' as const,
        block: blk,
        start: blk.start_time ?? '',
      })),
    ].sort((a, b) => a.start.localeCompare(b.start));

    const d = new Date(`${date}T12:00:00`);
    return {
      date,
      weekday: fmt(d, 'EEE', { locale: es }).replace('.', '').toUpperCase(),
      dayNumber: d.getDate(),
      isToday: date === todayIso,
      isSelected: date === props.selectedDate,
      events,
    };
  });
});

// ─── Cabecera: rango de semana y mes ────────────────────────
const rangeLabel = computed(() => {
  const dates = props.weekDates;
  if (dates.length === 0) return '';
  const first = new Date(`${dates[0]}T12:00:00`);
  const last = new Date(`${dates[dates.length - 1]}T12:00:00`);
  const fmtDay = (d: Date) => fmt(d, 'd MMM', { locale: es }).toUpperCase();
  return `${fmtDay(first)} — ${fmtDay(last)}`;
});

const isCurrentWeek = computed(() => {
  const today = new Date().toISOString().split('T')[0];
  return props.weekDates.includes(today);
});

const monthTitle = computed(() => {
  const anchor = props.selectedDate && props.weekDates.includes(props.selectedDate)
    ? props.selectedDate
    : props.weekDates[0];
  if (!anchor) return '';
  const d = new Date(`${anchor}T12:00:00`);
  return fmt(d, 'MMMM yyyy', { locale: es }).replace(/^(\w)/, (c) => c.toUpperCase());
});

// ─── DatePicker ─────────────────────────────────────────────
const pickerMonthLabel = computed(() => {
  const anchor = props.selectedDate && props.weekDates.includes(props.selectedDate)
    ? props.selectedDate
    : props.weekDates[0];
  if (!anchor) return '';
  const d = new Date(`${anchor}T12:00:00`);
  return fmt(d, 'MMMM yyyy', { locale: es }).replace(/^(\w)/, (c: string) => c.toUpperCase());
});

/** El picker trabaja con Date (02:00 para evitar derive de TZ en toISOString) */
const pickerValue = computed(() => {
  if (!props.selectedDate) return new Date();
  return new Date(`${props.selectedDate}T12:00:00`);
});

function onPickerPick(value: unknown) {
  const d = Array.isArray(value) ? (value[0] as Date) : (value as Date);
  if (!d) return;
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  emit('select-date', iso);
}

// Al cambiar de rango, cierra el popover (reabre en el mes correcto)
watch(() => props.weekDates[0], () => {
  pickerMenu.value = false;
});

// ─── Ficha de cierre / sello ────────────────────────────────
const closureDateLabel = computed(() => {
  if (!props.selectedDate) return '';
  return fmt(new Date(`${props.selectedDate}T12:00:00`), 'd MMM', { locale: es }).toUpperCase();
});

/** Resumen mini del día seleccionado: citas activas, pendientes y atendidas */
const closureStats = computed(() => {
  const col = columns.value.find((c) => c.isSelected);
  if (!col) return '';
  const actives = col.events.filter((e) => e.type === 'booking');
  const pending = actives.filter((e) => e.booking.status === 'pending_approval').length;
  const done = actives.filter((e) => e.booking.status === 'completed').length;
  const parts = [`${actives.length} citas`];
  if (pending > 0) parts.push(`${pending} por aprobar`);
  if (done > 0) parts.push(`${done} atendidas`);
  return parts.join(' · ');
});

// ─── Auto-scroll de la columna activa (touch: sin hover, la ficha debe ser visible)
const scrollRef = ref<HTMLElement | null>(null);

function scrollActiveIntoView() {
  if (typeof window === 'undefined') return;
  if (!window.matchMedia('(max-width: 960px)').matches) return;
  const active = scrollRef.value?.querySelector('.ec__col--active');
  active?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
}

watch(
  () => props.selectedDate,
  async () => {
    await nextTick();
    scrollActiveIntoView();
  },
  { immediate: true },
);

watch(() => props.loading, async (isLoading) => {
  if (!isLoading) {
    await nextTick();
    scrollActiveIntoView();
  }
});

// ─── Helpers ────────────────────────────────────────────────
function formatLong(date: string): string {
  return fmt(new Date(`${date}T12:00:00`), "EEEE d 'de' MMMM", { locale: es });
}

function employeeFirstName(employeeId: string | null): string {
  if (!employeeId) return 'Sin asignar';
  const name = props.employeeNames[employeeId];
  return name ? name.split(' ')[0] : 'Equipo';
}

function durationOf(booking: Booking): number | null {
  const custom = booking.custom_duration_minutes;
  if (custom) return custom;
  if (booking.service?.duration_minutes) return booking.service.duration_minutes;
  if (booking.start_time && booking.end_time) {
    const [hs, ms] = booking.start_time.split(':').map(Number);
    const [he, me] = booking.end_time.split(':').map(Number);
    const mins = (he || 0) * 60 + (me || 0) - ((hs || 0) * 60 + (ms || 0));
    return mins > 0 ? mins : null;
  }
  return null;
}

function eventClass(status: string): string {
  switch (status) {
    case 'pending_approval': return 'ec__event--pending';
    case 'completed': return 'ec__event--completed';
    case 'cancelled':
    case 'no_show': return 'ec__event--cancelled';
    default: return '';
  }
}
</script>

<style scoped>
/* Paleta: todo por variables de tema — respeta theming de tenant y dark mode */
.ec {
  --ec-hairline: rgb(var(--v-border-color), 0.35);
  --ec-accent: rgb(var(--v-theme-primary));
  --ec-ink: rgb(var(--v-theme-on-surface));
  width: 100%;
}

/* ── Cabecera ── */
.ec__nav-btn {
  color: var(--ec-ink);
}

.ec__range {
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-size: 11px;
  font-weight: 600;
  color: var(--ec-ink);
  white-space: nowrap;
}

.ec__today-btn {
  color: rgb(var(--v-theme-primary));
  font-weight: 600;
}

.ec__title {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 26px;
  font-weight: 500;
  color: var(--ec-ink);
  letter-spacing: 0.01em;
  text-align: center;
  margin: 0;
}

.ec__pick-btn {
  border-color: rgb(var(--v-border-color), var(--v-border-opacity));
  color: var(--ec-ink);
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

/* Popover del selector: tarjeta plana con sombra suave */
.ec__picker {
  background: rgb(var(--v-theme-surface));
  border-radius: 12px;
  box-shadow: 0 8px 40px rgba(var(--v-theme-on-surface), 0.14), 0 2px 8px rgba(var(--v-theme-on-surface), 0.08);
  padding: 12px 16px 16px;
}

.ec__picker-header {
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 11px;
  font-weight: 700;
  color: var(--ec-ink);
  margin-bottom: 4px;
}

/* ── Grid de columnas ── */
.ec__scroll {
  overflow-x: auto;
}

.ec__grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
}

.ec__col {
  border-left: 1px solid var(--ec-hairline);
  border-top: 2px solid transparent;
  display: flex;
  flex-direction: column;
  min-width: 0;
  position: relative;
  transition: background-color 0.15s ease;
}

.ec__col:first-child {
  border-left: none;
}

.ec__col--clickable:hover {
  background: rgb(var(--v-theme-surface-variant), 0.4);
}

/* Día seleccionado: el marcador del mockup se pinta con barrido (transition en width) */
.ec__sweep {
  position: absolute;
  top: -2px;
  left: 0;
  height: 2px;
  width: 0;
  background: var(--ec-accent);
  transition: width 0.22s ease-out;
  pointer-events: none;
}

.ec__col--active .ec__sweep {
  width: 100%;
}

.ec__col--today:not(.ec__col--active) {
  border-top: 2px solid rgb(var(--v-theme-secondary), 0.4);
}

/* ── Encabezado del día ── */
.ec__day-head {
  all: unset;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 14px 8px 10px;
  width: 100%;
  box-sizing: border-box;
}

.ec__day-head:focus-visible {
  outline: 2px solid var(--ec-accent);
  outline-offset: -2px;
  border-radius: 8px;
}

.ec__weekday {
  font-size: 10px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-on-surface), 0.55);
  margin-bottom: 2px;
}

.ec__daynum {
  /* Número grande light-weight: escala responsive (mockup: 34–40px) */
  font-size: clamp(24px, 2.6vw, 40px);
  font-weight: 300;
  line-height: 1.1;
  color: rgb(var(--v-theme-on-surface), 0.9);
  position: relative;
}

/* Día activo → número en acento */
.ec__col--active .ec__daynum {
  color: var(--ec-accent);
  font-weight: 350;
}

.ec__today-dot {
  position: absolute;
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%);
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: rgb(var(--v-theme-on-surface), 0.45);
}

/* ── Bloques ── */
.ec__events {
  display: flex;
  flex-direction: column;
  padding: 4px 0 12px;
  min-height: 0;
}

.ec__event {
  all: unset;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 14px;
  text-align: left;
  width: 100%;
  box-sizing: border-box;
  transition: background-color 0.12s ease;
}

.ec__event:focus-visible {
  outline: 2px solid var(--ec-accent);
  outline-offset: -2px;
}

.ec__event:hover {
  background: rgb(var(--v-theme-surface-variant), 0.5);
}

.ec__event:hover .ec__event-time {
  text-decoration: underline;
}

.ec__event-sep {
  border-bottom: 1px solid var(--ec-hairline);
  margin: 0 14px;
}

.ec__event-time {
  font-size: 13px;
  font-weight: 700;
  color: var(--ec-accent);
  letter-spacing: 0.02em;
}

.ec__event-title {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--ec-ink);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.ec__event-customer {
  color: rgb(var(--v-theme-on-surface), 0.6);
  font-weight: 400;
}

.ec__event-meta {
  font-size: 10px;
  color: rgb(var(--v-theme-on-surface), 0.55);
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

/* Estados: señalética sutil sin romper el monocromo */
.ec__event--pending {
  box-shadow: inset 2px 0 0 0 var(--ec-accent);
}

.ec__event--pending .ec__event-title {
  font-weight: 600;
}

.ec__event--completed .ec__event-title {
  color: rgb(var(--v-theme-on-surface), 0.6);
}

.ec__event--cancelled {
  opacity: 0.45;
}

.ec__event--cancelled .ec__event-title {
  text-decoration: line-through;
}

.ec__event--blocked {
  cursor: default;
  opacity: 0.55;
}

.ec__event--blocked .ec__event-time {
  color: rgb(var(--v-theme-on-surface), 0.55);
  font-weight: 600;
}

.ec__event--blocked .ec__event-title {
  color: rgb(var(--v-theme-on-surface), 0.7);
}

/* ── Día vacío ── */
.ec__empty {
  flex: 1;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 14px 0 40px;
  color: rgb(var(--v-theme-on-surface), 0.3);
  font-size: 14px;
  user-select: none;
}

/* ── Ficha de cierre / sello (solo en la columna del día seleccionado) ── */
.ec__closure {
  margin-top: auto;
  padding: 2px 10px 14px;
  display: flex;
  flex-direction: column;
}

/* Estado A — día abierto: la ficha "day ledger" al pie de la columna */
.ec__closure-tile {
  all: unset;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  min-height: 44px;
  padding: 10px 4px;
  cursor: pointer;
  border-top: 1px dashed var(--ec-hairline);
  transition: background-color 0.12s ease, border-color 0.18s ease, transform 0.08s ease;
}

.ec__closure-tile:focus-visible {
  outline: 2px solid var(--ec-accent);
  outline-offset: -2px;
}

.ec__closure-tile:active {
  background: rgb(var(--v-theme-primary), 0.1);
  transform: scale(0.985);
}

.ec__closure-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ec-accent);
}

.ec__closure-stats {
  font-size: 10px;
  color: rgb(var(--v-theme-on-surface), 0.55);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Hover con mouse: la hairline superior se pinta de acento (mejora progresiva) */
@media (pointer: fine) {
  .ec__closure-tile:hover {
    background: rgb(var(--v-theme-primary), 0.05);
    border-top-color: var(--ec-accent);
  }
}

/* Estado B — día cerrado: sello editorial */
.ec__stamp {
  all: unset;
  box-sizing: border-box;
  align-self: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-height: 44px;
  justify-content: center;
  padding: 10px 18px;
  margin: 10px 0 4px;
  cursor: pointer;
  border: 1.5px solid rgb(var(--v-theme-success));
  border-radius: 4px;
  color: rgb(var(--v-theme-success));
  transform: rotate(-6deg);
  animation: ec-stamp-in 240ms cubic-bezier(0.34, 1.56, 0.64, 1);
  transition: transform 0.08s ease, background-color 0.12s ease;
}

.ec__stamp:focus-visible {
  outline: 2px solid rgb(var(--v-theme-success));
  outline-offset: 3px;
}

.ec__stamp:hover {
  background: rgb(var(--v-theme-success), 0.06);
}

.ec__stamp:active {
  transform: rotate(-6deg) scale(0.97);
}

@keyframes ec-stamp-in {
  from {
    opacity: 0;
    transform: rotate(-14deg) scale(1.35);
  }
  to {
    opacity: 1;
    transform: rotate(-6deg) scale(1);
  }
}

.ec__stamp-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.ec__stamp-meta {
  font-size: 10px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  opacity: 0.85;
}

/* Día cerrado: los bloques del día se "descargan" visualmente */
.ec__col--sealed .ec__event:not(.ec__event--cancelled):not(.ec__event--blocked) {
  opacity: 0.8;
  transition: opacity 0.3s ease;
}

/* ── Skeleton ── */
.ec__grid--skeleton {
  min-height: 280px;
}

/* ── Responsive: scroll horizontal con columnas ancladas en móvil ── */
@media (max-width: 960px) {
  .ec__grid {
    grid-template-columns: none;
    grid-auto-flow: column;
    grid-auto-columns: minmax(200px, 1fr);
  }

  .ec__col:first-child {
    border-left: 1px solid var(--ec-hairline);
  }

  .ec__scroll {
    scroll-snap-type: x proximity;
  }

  .ec__col {
    scroll-snap-align: start;
  }

  .ec__title {
    font-size: 20px;
  }
}

/* ── Celular: header en dos filas, popover ancho ── */
@media (max-width: 600px) {
  .ec__header {
    flex-wrap: wrap;
    justify-content: space-between;
  }

  .ec__header > .v-spacer {
    display: none;
  }

  .ec__title {
    order: 3;
    width: 100%;
    margin-top: 2px;
  }

  .ec__picker {
    min-width: min(320px, 86vw);
  }
}

/* ── Touch: sin hover, los affordances viven en el estado de reposo ── */
@media (pointer: coarse) {
  /* La ficha se nota sin tocar: borde + tinte de reposo en acento */
  .ec__closure-tile {
    border: 1px solid rgb(var(--v-theme-primary), 0.55);
    border-radius: 6px;
    background: rgb(var(--v-theme-primary), 0.06);
    padding: 10px 12px;
  }

  /* Targets táctiles ≥ 44px */
  .ec__event {
    min-height: 44px;
    justify-content: center;
    transition: background-color 0.12s ease, transform 0.08s ease;
  }

  .ec__event:active {
    background: rgb(var(--v-theme-surface-variant), 0.7);
    transform: scale(0.985);
  }

  .ec__day-head {
    min-height: 44px;
    justify-content: center;
    transition: transform 0.08s ease;
  }

  .ec__day-head:active {
    transform: scale(0.98);
  }
}

/* ── Accesibilidad: respeta reduced motion en todas las animaciones ── */
@media (prefers-reduced-motion: reduce) {
  .ec__sweep {
    transition: none;
  }

  .ec__col--active .ec__sweep {
    width: 100%;
  }

  .ec__stamp {
    animation: none;
  }

  .ec__closure-tile,
  .ec__event,
  .ec__col,
  .ec__stamp {
    transition: none;
  }

  .ec__closure-tile:active,
  .ec__event:active,
  .ec__day-head:active,
  .ec__stamp:active {
    transform: none;
  }
}
</style>
