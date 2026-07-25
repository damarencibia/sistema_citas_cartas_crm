<template>
  <div class="booking-calendar">
    <div class="d-flex align-center justify-space-between mb-4">
      <div class="d-flex align-center ga-2">
        <v-btn
          icon="mdi-chevron-left"
          size="small"
          variant="text"
          @click="onPrev"
        />
        <h3 class="text-subtitle-1 font-weight-medium" style="min-width: 200px; text-align: center">
          {{ displayTitle }}
        </h3>
        <v-btn
          icon="mdi-chevron-right"
          size="small"
          variant="text"
          @click="onNext"
        />
        <v-btn size="small" variant="outlined" @click="onToday">Hoy</v-btn>
      </div>
      <v-btn-toggle
        v-model="localView"
        mandatory
        density="compact"
        color="primary"
      >
        <v-btn value="day" size="small">Día</v-btn>
        <v-btn value="week" size="small">Semana</v-btn>
      </v-btn-toggle>
    </div>

    <div v-if="localView === 'day'" class="day-view">
      <div
        v-for="hour in hours"
        :key="hour"
        class="hour-row d-flex"
        :style="{ height: '48px' }"
      >
        <div class="hour-label text-caption text-medium-emphasis" style="width: 60px">
          {{ formatHour(hour) }}
        </div>
        <v-divider vertical />
        <div class="hour-content flex-grow-1 position-relative">
          <BookingCard
            v-for="booking in getBookingsForHour(hour)"
            :key="booking.id"
            :booking="booking"
            class="hour-booking"
            @detail="emit('detail', $event)"
          />
        </div>
      </div>
    </div>

    <div v-else class="week-view">
      <div class="d-flex">
        <div style="width: 60px" />
        <div
          v-for="(date, i) in weekDates"
          :key="date"
          class="flex-grow-1 text-center text-caption"
          :class="{ 'text-primary font-weight-bold': date === today }"
        >
          {{ weekDayLabels[i] }} {{ parseDate(date).getDate() }}
        </div>
      </div>
      <div
        v-for="hour in hours"
        :key="hour"
        class="hour-row d-flex"
        :style="{ height: '40px' }"
      >
        <div class="hour-label text-caption text-medium-emphasis" style="width: 60px">
          {{ formatHour(hour) }}
        </div>
        <div
          v-for="date in weekDates"
          :key="`${date}-${hour}`"
          class="flex-grow-1 hour-cell"
          :class="{ 'today-col': date === today }"
        >
          <BookingCard
            v-for="booking in getBookingsForDateHour(date, hour)"
            :key="booking.id"
            :booking="booking"
            class="hour-booking week-booking"
            @detail="emit('detail', $event)"
          />
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
  currentDate: string;
  view: 'day' | 'week';
}>();

const emit = defineEmits<{
  'update:date': [date: string];
  'update:view': [view: 'day' | 'week'];
  detail: [booking: Booking];
}>();

const localView = computed({
  get: () => props.view,
  set: (v) => emit('update:view', v as 'day' | 'week'),
});

const hours = Array.from({ length: 16 }, (_, i) => i + 6);
const today = new Date().toISOString().split('T')[0];

const weekDayLabels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const displayTitle = computed(() => {
  const d = parseDate(props.currentDate);
  if (localView.value === 'day') {
    return d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
  }
  const weekDates = getWeekDates();
  const start = parseDate(weekDates[0]);
  const end = parseDate(weekDates[6]);
  return `${start.getDate()} ${start.toLocaleDateString('es-MX', { month: 'short' })} - ${end.getDate()} ${end.toLocaleDateString('es-MX', { month: 'short', year: 'numeric' })}`;
});

const weekDates = computed(() => getWeekDates());

function getWeekDates(): string[] {
  const dates: string[] = [];
  const d = parseDate(props.currentDate);
  const day = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  for (let i = 0; i < 7; i++) {
    const dd = new Date(monday);
    dd.setDate(monday.getDate() + i);
    dates.push(dd.toISOString().split('T')[0]);
  }
  return dates;
}

function getBookingsForHour(hour: number): Booking[] {
  return props.bookings.filter((b) => {
    if (b.date !== props.currentDate) return false;
    const h = parseInt(b.start_time.split(':')[0], 10);
    return h === hour;
  });
}

function getBookingsForDateHour(date: string, hour: number): Booking[] {
  return props.bookings.filter((b) => {
    if (b.date !== date) return false;
    const h = parseInt(b.start_time.split(':')[0], 10);
    return h === hour;
  });
}

function onPrev() {
  const d = parseDate(props.currentDate);
  d.setDate(d.getDate() - (localView.value === 'week' ? 7 : 1));
  emit('update:date', d.toISOString().split('T')[0]);
}

function onNext() {
  const d = parseDate(props.currentDate);
  d.setDate(d.getDate() + (localView.value === 'week' ? 7 : 1));
  emit('update:date', d.toISOString().split('T')[0]);
}

function onToday() {
  emit('update:date', today);
}

function parseDate(dateStr: string): Date {
  return new Date(dateStr + 'T12:00:00');
}

function formatHour(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}
</script>

<style scoped>
.hour-row {
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}
.hour-label {
  padding: 4px 8px;
}
.hour-content {
  padding: 2px 4px;
}
.hour-booking {
  margin: 1px 0;
}
.week-booking {
  font-size: 0.75rem;
}
.hour-cell {
  border-left: 1px solid rgba(0, 0, 0, 0.06);
}
.today-col {
  background-color: rgba(var(--v-theme-primary), 0.04);
}
</style>
