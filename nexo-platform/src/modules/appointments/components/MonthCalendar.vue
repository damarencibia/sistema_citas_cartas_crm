<template>
  <div class="month-calendar">
    <div class="d-flex align-center ga-1 mb-3">
      <v-btn
        icon="mdi-chevron-left"
        size="small"
        variant="text"
        :disabled="loading"
        @click="emit('prev-month')"
      />
      <h3 class="text-subtitle-1 font-weight-medium text-center flex-grow-1">
        {{ displayTitle }}
      </h3>
      <v-btn
        icon="mdi-chevron-right"
        size="small"
        variant="text"
        :disabled="loading"
        @click="emit('next-month')"
      />
    </div>
    <div class="d-flex align-center justify-center mb-3">
      <v-btn size="small" variant="outlined" @click="emit('today')">Hoy</v-btn>
    </div>

    <div v-if="loading" class="text-center pa-6">
      <v-progress-circular indeterminate color="primary" size="28" />
    </div>

    <template v-else>
      <div class="month-calendar__weekdays">
        <div v-for="label in weekDayLabels" :key="label" class="month-calendar__weekday">
          {{ label }}
        </div>
      </div>
      <div class="month-calendar__grid">
        <div
          v-for="(date, i) in gridDates"
          :key="date ?? `empty-${i}`"
          class="month-calendar__cell"
          :class="{
            'month-calendar__cell--outside': !date,
          }"
        >
          <div
            v-if="date"
            class="month-calendar__day"
            :class="{
              'month-calendar__day--in-month': isInMonth(date),
              'month-calendar__day--today': date === today,
              'month-calendar__day--selected': date === selectedDate,
              'month-calendar__day--booked': isInMonth(date) && countFor(date) > 0,
            }"
            role="button"
            tabindex="0"
            @click="emit('select-date', date)"
            @keydown.enter="emit('select-date', date)"
          >
            <div class="month-calendar__day-weekday">{{ weekdayShort(date) }}</div>
            <div class="month-calendar__day-number">{{ parseDate(date).getDate() }}</div>
            <div class="month-calendar__day-info">
              <template v-if="isInMonth(date) && countFor(date) > 0">
                <span class="month-calendar__day-count">{{ countFor(date) }}</span>
                <span class="month-calendar__day-count-label">turnos</span>
                <v-badge
                  v-if="pendingFor(date) > 0"
                  :content="pendingFor(date)"
                  color="amber"
                  inline
                  class="ml-1"
                />
              </template>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { WeekDayCount } from './WeekDayStrip.vue';

const props = defineProps<{
  monthAnchor: string;
  counts: Record<string, WeekDayCount>;
  selectedDate: string | null;
  loading?: boolean;
}>();

const emit = defineEmits<{
  'select-date': [date: string];
  'prev-month': [];
  'next-month': [];
  today: [];
}>();

const weekDayLabels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const today = new Date().toISOString().split('T')[0];

const displayTitle = computed(() => {
  const d = parseDate(props.monthAnchor);
  return d.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
});

const gridDates = computed<Array<string | null>>(() => {
  const anchor = parseDate(props.monthAnchor);
  const year = anchor.getFullYear();
  const month = anchor.getMonth();

  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const gridStart = new Date(year, month, 1 - startOffset);

  const cells: Array<string | null> = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    cells.push(toIso(d));
  }
  return cells;
});

function weekdayShort(date: string): string {
  const d = parseDate(date);
  return weekDayLabels[(d.getDay() + 6) % 7];
}

function isInMonth(date: string): boolean {
  const d = parseDate(date);
  const anchor = parseDate(props.monthAnchor);
  return d.getMonth() === anchor.getMonth() && d.getFullYear() === anchor.getFullYear();
}

function countFor(date: string): number {
  return props.counts[date]?.total ?? 0;
}

function pendingFor(date: string): number {
  return props.counts[date]?.pending ?? 0;
}

function parseDate(dateStr: string): Date {
  return new Date(dateStr + 'T12:00:00');
}

function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
</script>

<style scoped>
.month-calendar__weekdays {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 6px;
  margin-bottom: 6px;
}

.month-calendar__weekday {
  text-align: center;
  font-size: 12px;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface), 0.6);
}

.month-calendar__grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 6px;
}

.month-calendar__cell {
  display: flex;
  min-width: 0;
}

.month-calendar__day {
  flex: 1 1 0%;
  min-width: 0;
  width: 100%;
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 8px;
  padding: 8px 4px;
  min-height: 64px;
  text-align: center;
  cursor: pointer;
  background-color: rgb(var(--v-theme-surface));
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
}

.month-calendar__day:hover {
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
  border-color: rgba(0, 0, 0, 0.2);
}

.month-calendar__day--outside {
  opacity: 0.45;
  cursor: default;
}

.month-calendar__day--booked {
  background-color: rgb(var(--v-theme-primary) / 0.15);
  border-color: rgb(var(--v-theme-primary) / 0.4);
}

.month-calendar__day--selected {
  border-color: rgb(var(--v-theme-primary));
  background-color: rgb(var(--v-theme-primary));
}

.month-calendar__day--today {
  background-color: rgb(var(--v-theme-primary));
  border-color: rgb(var(--v-theme-primary));
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.month-calendar__day--today:hover {
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  border-color: rgb(var(--v-theme-primary));
}

.month-calendar__day--selected .month-calendar__day-number,
.month-calendar__day--today .month-calendar__day-number,
.month-calendar__day--selected .month-calendar__day-weekday,
.month-calendar__day--today .month-calendar__day-weekday,
.month-calendar__day--selected .month-calendar__day-count,
.month-calendar__day--today .month-calendar__day-count,
.month-calendar__day--selected .month-calendar__day-count-label,
.month-calendar__day--today .month-calendar__day-count-label {
  color: #fff !important;
}

.month-calendar__day-number {
  font-size: 15px;
  font-weight: 700;
  line-height: 1.3;
  color: rgb(var(--v-theme-on-surface));
}

.month-calendar__day-weekday {
  display: none;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.2;
  color: rgb(var(--v-theme-on-surface), 0.6);
}

.month-calendar__day-info {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 20px;
  margin-top: 4px;
}

.month-calendar__day-count {
  font-size: 13px;
  font-weight: 600;
  color: rgb(var(--v-theme-primary));
}

.month-calendar__day-count-label {
  font-size: 11px;
  color: rgb(var(--v-theme-on-surface), 0.5);
  margin-left: 4px;
}

@media (max-width: 599.98px) {
  .month-calendar__weekdays {
    display: none;
  }

  .month-calendar__grid {
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 8px;
  }

  .month-calendar__day {
    min-height: 68px;
    padding: 8px 4px;
  }

  .month-calendar__day-number {
    font-size: 17px;
  }

  .month-calendar__day-weekday {
    display: block;
  }
}
</style>
