<template>
  <div class="week-day-strip">
    <div class="d-flex align-center ga-1 mb-3">
      <v-btn
        icon="mdi-chevron-left"
        size="small"
        variant="text"
        :disabled="loading"
        @click="emit('prev-week')"
      />
      <h3 class="text-subtitle-1 font-weight-medium text-center flex-grow-1">
        {{ displayTitle }}
      </h3>
      <v-btn
        icon="mdi-chevron-right"
        size="small"
        variant="text"
        :disabled="loading"
        @click="emit('next-week')"
      />
    </div>
    <div class="d-flex align-center justify-center mb-3">
      <v-btn size="small" variant="outlined" @click="emit('today')">Hoy</v-btn>
    </div>

    <div v-if="loading" class="text-center pa-6">
      <v-progress-circular indeterminate color="primary" size="28" />
    </div>

    <div v-else class="week-day-strip__grid">
      <div
        v-for="(date, i) in weekDates"
        :key="date"
        class="week-day-card"
        :class="{
          'week-day-card--selected': date === selectedDate,
          'week-day-card--today': date === today,
        }"
        role="button"
        tabindex="0"
        @click="emit('select-date', date)"
        @keydown.enter="emit('select-date', date)"
      >
        <div class="week-day-card__label">{{ weekDayLabels[i] }}</div>
        <div class="week-day-card__day">{{ parseDate(date).getDate() }}</div>
        <div class="week-day-card__info">
          <span class="week-day-card__count">{{ countFor(date) }}</span>
          <span class="week-day-card__count-label">turnos</span>
          <v-badge
            v-if="pendingFor(date) > 0"
            :content="pendingFor(date)"
            color="amber"
            inline
            class="ml-1"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

export interface WeekDayCount {
  total: number;
  pending: number;
}

const props = defineProps<{
  weekDates: string[];
  counts: Record<string, WeekDayCount>;
  selectedDate: string | null;
  loading?: boolean;
}>();

const emit = defineEmits<{
  'select-date': [date: string];
  'prev-week': [];
  'next-week': [];
  today: [];
}>();

const weekDayLabels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const today = new Date().toISOString().split('T')[0];

const displayTitle = computed(() => {
  if (!props.weekDates.length) return '';
  const start = parseDate(props.weekDates[0]);
  const end = parseDate(props.weekDates[props.weekDates.length - 1]);
  return `${start.getDate()} ${start.toLocaleDateString('es-MX', { month: 'short' })} - ${end.getDate()} ${end.toLocaleDateString('es-MX', { month: 'short', year: 'numeric' })}`;
});

function countFor(date: string): number {
  return props.counts[date]?.total ?? 0;
}

function pendingFor(date: string): number {
  return props.counts[date]?.pending ?? 0;
}

function parseDate(dateStr: string): Date {
  return new Date(dateStr + 'T12:00:00');
}
</script>

<style scoped>
.week-day-strip__grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}

.week-day-card {
  flex: 0 0 calc(20% - 8px);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 8px;
  padding: 10px 6px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
  background-color: rgb(var(--v-theme-surface));
}

.week-day-card:hover {
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
  border-color: rgba(0, 0, 0, 0.2);
}

.week-day-card--today {
  border-color: rgb(var(--v-theme-primary));
}

.week-day-card--selected {
  border-color: rgb(var(--v-theme-primary));
  background-color: rgb(var(--v-theme-primary));
}

.week-day-card--selected .week-day-card__label,
.week-day-card--selected .week-day-card__day,
.week-day-card--selected .week-day-card__count,
.week-day-card--selected .week-day-card__count-label {
  color: #fff !important;
}

.week-day-card__label {
  font-size: 12px;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface), 0.6);
}

.week-day-card__day {
  font-size: 20px;
  font-weight: 700;
  line-height: 1.3;
  color: rgb(var(--v-theme-on-surface));
}

.week-day-card__info {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 4px;
}

.week-day-card__count {
  font-size: 13px;
  font-weight: 600;
  color: rgb(var(--v-theme-primary));
}

.week-day-card__count-label {
  font-size: 11px;
  color: rgb(var(--v-theme-on-surface), 0.5);
  margin-left: 4px;
}

@media (max-width: 599.98px) {
  .week-day-card {
    flex: 0 0 calc(50% - 8px);
  }
}
</style>
