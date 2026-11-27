<template>
  <section class="mab">
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
            <v-icon start size="16">mdi-calendar-blank</v-icon>
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
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { format as fmt } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Booking } from '../types/booking.types';

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
}>();

const emit = defineEmits<{
  'select-date': [date: string];
  'prev-month': [];
  'next-month': [];
  'prev-year': [];
  'next-year': [];
  today: [];
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
</script>

<style scoped>
.mab {
  --hairline: rgb(var(--v-theme-on-surface), 0.12);
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  padding: 20px 44px 22px;
  border: 1px solid var(--hairline);
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
}

/* ═══ Cabecera ═══ */
.mab__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 2px;
}

.mab__year {
  min-height: 44px;
  padding: 4px 8px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: rgb(var(--v-theme-primary));
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
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
  margin-bottom: 12px;
}

.mab__today.v-btn {
  min-height: 44px;
  color: rgb(var(--v-theme-on-surface), 0.65);
}

.mab__nav-inline {
  display: none;
}

.mab__nav-inline :deep(.v-btn) {
  min-width: 44px;
  min-height: 44px;
}

.mab__pick-btn.v-btn {
  min-height: 44px;
  color: rgb(var(--v-theme-on-surface));
  border-color: rgb(var(--v-theme-on-surface), 0.2);
}

.mab__weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px 8px;
  margin-bottom: 8px;
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
  min-height: 0;
  display: flex;
  align-items: stretch;
}

.mab__grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  grid-auto-rows: minmax(48px, 1fr);
  gap: 6px 8px;
  width: 100%;
}

.mab__week {
  display: contents;
}

.mab__cell {
  display: flex;
  align-items: stretch;
  justify-content: center;
  min-height: 0;
}

.mab__day {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  width: 100%;
  height: 100%;
  min-height: 48px;
  padding: 4px 2px;
  border: 0;
  border-radius: 8px;
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

/* Flechas circulares (navegación principal del calendario: acento del tenant) */
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
  left: -18px;
}

.mab__arrow--right {
  right: -18px;
}

.mab__arrow:not(:disabled):active {
  transform: translateY(-50%) scale(0.94);
}

/* Skeleton */
.mab__grid--skeleton {
  flex: 1 1 auto;
  align-content: stretch;
}

.mab__skeleton {
  min-height: 44px;
  border-radius: 8px;
  background: rgb(var(--v-theme-on-surface), 0.06);
}

/* Picker */
.mab__picker {
  padding: 12px;
  border: 1px solid var(--hairline);
  border-radius: 8px;
  background: rgb(var(--v-theme-surface));
  box-shadow: 0 8px 24px rgb(var(--v-theme-on-surface), 0.16);
}

/* ═══ Responsive ═══ */
@media (max-width: 1279px) {
  .mab {
    padding: 16px 32px 18px;
  }
}

@media (max-width: 899px) {
  .mab {
    padding: 14px 14px 16px;
    border-radius: 10px;
  }

  .mab__arrow {
    display: none;
  }

  .mab__nav-inline {
    display: inline-flex;
  }

  .mab__grid {
    grid-auto-rows: minmax(44px, 1fr);
  }
}

@media (max-width: 599px) {
  .mab {
    padding: 12px 8px 14px;
  }

  .mab__title {
    font-size: 15px;
    letter-spacing: 0.04em;
  }

  .mab__weekdays {
    gap: 2px 4px;
  }

  .mab__grid {
    gap: 2px 4px;
  }

  .mab__day {
    min-height: 40px;
    padding: 2px 0;
  }

  .mab__daynum {
    min-width: 26px;
    height: 26px;
    font-size: 12px;
  }

  .mab__daycount {
    font-size: 8px;
  }

  .mab__pick-btn.v-btn {
    font-size: 0;
    min-width: 44px;
    padding: 0 8px;
  }

  .mab__pick-btn.v-btn :deep(.v-btn__prepend) {
    margin-inline-end: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .mab__day,
  .mab__arrow {
    transition: none;
  }

  .mab__arrow:not(:disabled):active {
    transform: translateY(-50%);
  }
}
</style>
