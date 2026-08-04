<template>
  <div class="schedule-week-grid">
    <div class="schedule-week-grid__scroll">
      <v-table density="compact" class="schedule-week-grid__table">
        <thead>
          <tr>
            <th class="text-left" style="width: 100px">Hora</th>
            <th v-for="day in daysOfWeek" :key="day.value" class="text-center">
              <div class="text-caption">{{ day.label }}</div>
              <v-switch
                :model-value="isDayActive(day.value)"
                density="compact"
                color="primary"
                hide-details
                @update:model-value="emit('toggleDay', day.value)"
              />
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="hour in visibleHours" :key="hour">
            <td class="text-caption text-medium-emphasis">{{ formatHour(hour) }}</td>
            <td
              v-for="day in daysOfWeek"
              :key="`${day.value}-${hour}`"
              :class="getCellClass(day.value, hour)"
            />
          </tr>
        </tbody>
      </v-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Schedule } from '../types/schedule.types';

const props = defineProps<{
  schedules: Schedule[];
}>();

const emit = defineEmits<{
  toggleDay: [day: number];
}>();

const daysOfWeek = [
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mié' },
  { value: 4, label: 'Jue' },
  { value: 5, label: 'Vie' },
  { value: 6, label: 'Sáb' },
  { value: 0, label: 'Dom' },
];

const visibleHours = computed(() => Array.from({ length: 16 }, (_, i) => i + 6));

function isDayActive(day: number): boolean {
  return props.schedules.some((s) => s.day_of_week === day && s.is_active);
}

function getScheduleForDay(day: number): Schedule | undefined {
  return props.schedules.find((s) => s.day_of_week === day);
}

function getCellClass(day: number, hour: number): string {
  const schedule = getScheduleForDay(day);
  if (!schedule || !schedule.is_active) return '';
  const startHour = parseInt(schedule.start_time.split(':')[0], 10);
  const endHour = parseInt(schedule.end_time.split(':')[0], 10);
  return hour >= startHour && hour < endHour ? 'active-cell' : '';
}

function formatHour(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}
</script>

<style scoped>
.schedule-week-grid__scroll {
  overflow-x: auto;
}

.schedule-week-grid__table {
  min-width: 560px;
}

.active-cell {
  background-color: rgb(var(--v-theme-primary));
  opacity: 0.3;
}
</style>
