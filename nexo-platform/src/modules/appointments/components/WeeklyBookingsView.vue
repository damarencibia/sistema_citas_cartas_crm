<template>
  <div class="weekly-bookings">
    <div class="d-flex align-center ga-1 mb-3">
      <v-btn
        icon="mdi-chevron-left"
        size="small"
        variant="text"
        @click="onPrevWeek"
      />
      <h3 class="text-subtitle-1 font-weight-medium text-center flex-grow-1">
        {{ displayTitle }}
      </h3>
      <v-btn
        icon="mdi-chevron-right"
        size="small"
        variant="text"
        @click="onNextWeek"
      />
    </div>
    <div class="d-flex align-center justify-center mb-3">
      <v-btn size="small" variant="outlined" @click="onToday">Hoy</v-btn>
    </div>

    <div v-if="loading" class="text-center pa-8">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <div v-else class="weekly-bookings__scroll">
      <div class="weekly-bookings__grid">
        <div
          v-for="(date, i) in weekDates"
          :key="date"
          class="weekly-col"
          :class="{ 'weekly-col--today': date === today }"
        >
          <div class="weekly-col__header">
            <div class="text-caption font-weight-medium">{{ weekDayLabels[i] }}</div>
            <div
              class="weekly-col__day"
              :class="{ 'weekly-col__day--today': date === today }"
            >
              {{ parseDate(date).getDate() }}
            </div>
          </div>
          <div class="weekly-col__body">
            <BookingCard
              v-for="booking in getBookingsForDate(date)"
              :key="booking.id"
              :booking="booking"
              compact
              class="weekly-booking"
              @detail="emit('detail', $event)"
            />
            <div v-if="getBookingsForDate(date).length === 0" class="weekly-col__empty">
              Sin reservas
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import BookingCard from './BookingCard.vue';
import type { Booking } from '../types/booking.types';

const props = defineProps<{
  bookings: Booking[];
  weekDates: string[];
  currentDate: string;
  loading?: boolean;
}>();

const emit = defineEmits<{
  'update:date': [date: string];
  detail: [booking: Booking];
}>();

const weekDayLabels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const today = new Date().toISOString().split('T')[0];

const displayTitle = computed(() => {
  if (!props.weekDates.length) return '';
  const start = parseDate(props.weekDates[0]);
  const end = parseDate(props.weekDates[props.weekDates.length - 1]);
  return `${start.getDate()} ${start.toLocaleDateString('es-MX', { month: 'short' })} - ${end.getDate()} ${end.toLocaleDateString('es-MX', { month: 'short', year: 'numeric' })}`;
});

function getBookingsForDate(date: string): Booking[] {
  return props.bookings
    .filter((b) => b.date === date)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));
}

function onPrevWeek() {
  emit('update:date', shiftWeek(-7));
}

function onNextWeek() {
  emit('update:date', shiftWeek(7));
}

function onToday() {
  emit('update:date', today);
}

function shiftWeek(days: number): string {
  const d = parseDate(props.currentDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function parseDate(dateStr: string): Date {
  return new Date(dateStr + 'T12:00:00');
}
</script>

<style scoped>
.weekly-bookings__scroll {
  overflow-x: auto;
}

.weekly-bookings__grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(140px, 1fr));
  min-width: 980px;
  gap: 8px;
}

.weekly-col {
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.weekly-col--today {
  border-color: rgb(var(--v-theme-primary));
}

.weekly-col__header {
  text-align: center;
  padding: 8px 4px;
  background-color: rgb(var(--v-theme-surface-variant));
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

.weekly-col__day {
  font-size: 18px;
  font-weight: 600;
  line-height: 1.2;
}

.weekly-col__day--today {
  color: #fff;
  background-color: rgb(var(--v-theme-primary));
  border-radius: 50%;
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.weekly-col__body {
  padding: 6px;
  flex: 1;
}

.weekly-booking {
  margin-bottom: 6px;
}

.weekly-col__empty {
  text-align: center;
  padding: 12px 4px;
  font-size: 12px;
  color: rgb(var(--v-theme-on-surface), 0.4);
}
</style>
