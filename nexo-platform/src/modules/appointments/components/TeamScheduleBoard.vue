<template>
  <div class="team-board">
    <!-- Navegación del día -->
    <div class="d-flex align-center justify-center ga-2 mb-4 flex-wrap">
      <v-btn
        icon
        size="small"
        variant="text"
        aria-label="Día anterior"
        @click="changeDay(-1)"
      >
        <v-icon>mdi-chevron-left</v-icon>
      </v-btn>
      <v-btn
        size="small"
        variant="tonal"
        color="primary"
        rounded="lg"
        @click="changeDay(0)"
      >
        Hoy
      </v-btn>
      <span class="text-subtitle-1 font-weight-semibold text-capitalize" style="min-width: 210px; text-align: center;">
        {{ dayLabel }}
      </span>
      <v-btn
        icon
        size="small"
        variant="text"
        aria-label="Día siguiente"
        @click="changeDay(1)"
      >
        <v-icon>mdi-chevron-right</v-icon>
      </v-btn>
    </div>

    <div v-if="loading" class="text-center pa-8">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <div v-else-if="columns.length === 0" class="text-center pa-8">
      <v-icon size="64" color="medium-emphasis">mdi-account-group-outline</v-icon>
      <p class="text-body-1 text-medium-emphasis mt-4">No hay empleados activos</p>
    </div>

    <!-- Gantt simple: columnas por empleado, bloques por hora -->
    <div v-else class="board-scroll">
      <div class="board-grid" :style="{ '--hour-h': `${hourH}px` }">
        <!-- Franja de horas -->
        <div class="time-gutter">
          <div class="gutter-header" />
          <div
            v-for="hour in hours"
            :key="hour"
            class="gutter-hour text-caption text-medium-emphasis"
          >
            {{ `${String(hour).padStart(2, '0')}:00` }}
          </div>
        </div>

        <!-- Columna por empleado -->
        <div
          v-for="col in columns"
          :key="col.employeeId"
          class="employee-column"
        >
          <div
            class="column-header"
            :title="`Abrir la agenda de ${col.employeeName}`"
            @click="$emit('select-employee', col.employeeId)"
          >
            <span class="text-subtitle-2 font-weight-semibold text-truncate">{{ col.employeeName }}</span>
            <v-chip
              size="x-small"
              variant="tonal"
              :color="col.bookings.length > 0 ? 'primary' : undefined"
              class="ml-1"
            >
              {{ col.bookings.length }}
            </v-chip>
          </div>

          <div class="column-body">
            <div
              v-for="hour in hours.slice(0, hours.length - 1)"
              :key="`line-${col.employeeId}-${hour}`"
              class="hour-line"
              :style="{ top: `${(hour - startHour) * hourH}px` }"
            />
            <div
              v-for="b in col.bookings"
              :key="b.id"
              class="booking-block"
              :class="[`booking-block--${b.status}`, { 'booking-block--clickable': true }]"
              :style="blockStyle(b)"
              :title="`${b.start_time?.slice(0, 5)}–${b.end_time?.slice(0, 5)} · ${b.service?.name ?? ''} · ${b.customer_name ?? ''}`"
              @click="$emit('open-booking', b)"
            >
              <div class="text-caption font-weight-semibold text-truncate">
                {{ b.start_time?.slice(0, 5) }} {{ b.service?.name ?? 'Servicio' }}
              </div>
              <div class="text-caption text-truncate booking-block__customer">
                {{ b.customer_name || 'Cliente' }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { bookingRepository } from '../repositories/booking.repository';
import type { Booking } from '../types/booking.types';

interface BoardEmployee {
  id: string;
  first_name: string;
  last_name: string;
}

const props = defineProps<{
  date: string;
  employees: BoardEmployee[];
}>();

const emit = defineEmits<{
  'change-date': [date: string];
  'open-booking': [booking: Booking];
  'select-employee': [employeeId: string];
}>();

const hourH = 56;
const loading = ref(false);
const bookings = ref<Booking[]>([]);

const DEFAULT_START = 9;
const DEFAULT_END = 20;

const activeEmployeeIds = computed(() => new Set(props.employees.map((e) => e.id)));

const employeeNameById = computed(() => {
  const map: Record<string, string> = {};
  for (const e of props.employees) {
    map[e.id] = `${e.first_name} ${e.last_name}`;
  }
  return map;
});

const dayBookings = computed(() =>
  bookings.value.filter(
    (b) => b.date === props.date && b.employee_id && activeEmployeeIds.value.has(b.employee_id),
  ),
);

function toMinutes(time?: string | null): number {
  if (!time) return 0;
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

const startHour = computed(() => {
  let min = Number.POSITIVE_INFINITY;
  for (const b of dayBookings.value) {
    min = Math.min(min, Math.floor(toMinutes(b.start_time) / 60));
  }
  if (!Number.isFinite(min)) return DEFAULT_START;
  return Math.max(0, Math.min(min, DEFAULT_START));
});

const endHour = computed(() => {
  let max = 0;
  for (const b of dayBookings.value) {
    max = Math.max(max, Math.ceil(toMinutes(b.end_time) / 60));
  }
  const fallback = startHour.value + 8;
  return Math.min(24, Math.max(max === 0 ? fallback : max, DEFAULT_END));
});

const hours = computed(() => {
  const list: number[] = [];
  for (let h = startHour.value; h <= endHour.value; h++) list.push(h);
  return list;
});

interface Column {
  employeeId: string;
  employeeName: string;
  bookings: Booking[];
}

const columns = computed<Column[]>(() =>
  props.employees.map((e) => ({
    employeeId: e.id,
    employeeName: employeeNameById.value[e.id] ?? `${e.first_name} ${e.last_name}`,
    bookings: dayBookings.value
      .filter((b) => b.employee_id === e.id)
      .sort((a, b) => (a.start_time ?? '').localeCompare(b.start_time ?? '')),
  })),
);

function blockStyle(b: Booking): Record<string, string> {
  const startMin = toMinutes(b.start_time);
  const endMin = Math.max(startMin + 15, toMinutes(b.end_time));
  const top = ((startMin - startHour.value * 60) / 60) * hourH;
  const height = Math.max(((endMin - startMin) / 60) * hourH - 2, 20);
  return { top: `${top}px`, height: `${height}px` };
}

const dayLabel = computed(() => {
  if (!props.date) return '';
  const d = new Date(`${props.date}T12:00:00`);
  return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
});

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function changeDay(days: number) {
  const base = props.date ? new Date(`${props.date}T12:00:00`) : new Date();
  if (days !== 0) base.setDate(base.getDate() + days);
  emit('change-date', toIsoDate(base));
}

async function fetchBookings() {
  if (!props.date) {
    bookings.value = [];
    return;
  }
  loading.value = true;
  try {
    const data = await bookingRepository.getByFilters({
      date_from: props.date,
      date_to: props.date,
    });
    bookings.value = data.filter((b) => b.status !== 'cancelled');
  } finally {
    loading.value = false;
  }
}

onMounted(fetchBookings);
watch(() => props.date, fetchBookings);
</script>

<style scoped>
.board-scroll {
  overflow-x: auto;
  padding-bottom: 8px;
}

.board-grid {
  display: flex;
  min-width: fit-content;
}

.time-gutter {
  width: 56px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
}

.gutter-header {
  height: 40px;
  flex-shrink: 0;
}

.gutter-hour {
  height: var(--hour-h);
  flex-shrink: 0;
  display: flex;
  justify-content: center;
  transform: translateY(-8px);
}

.employee-column {
  width: 200px;
  flex-shrink: 0;
  border-left: 1px solid rgb(var(--v-border));
}

.column-header {
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  cursor: pointer;
  padding: 0 8px;
  border-bottom: 1px solid rgb(var(--v-border));
  border-top: 2px solid rgb(var(--v-theme-primary));
  transition: background-color 0.15s ease;
}

.column-header:hover {
  background-color: color-mix(in srgb, rgb(var(--v-theme-primary)) 8%, transparent);
}

.column-body {
  position: relative;
  height: calc((v-bind(hours.length) - 1) * var(--hour-h));
}

.hour-line {
  position: absolute;
  left: 0;
  right: 0;
  border-top: 1px dashed rgb(var(--v-border));
}

.booking-block {
  position: absolute;
  left: 4px;
  right: 4px;
  padding: 2px 6px;
  border-radius: 6px;
  overflow: hidden;
  border-left: 3px solid rgb(var(--v-theme-primary));
  background-color: color-mix(in srgb, rgb(var(--v-theme-primary)) 12%, transparent);
  cursor: pointer;
  transition: filter 0.15s ease;
}

.booking-block:hover {
  filter: brightness(0.96);
}

.booking-block__customer {
  color: var(--text-muted);
}

.booking-block--pending_approval {
  border-left-color: rgb(var(--v-theme-warning));
  background-color: color-mix(in srgb, rgb(var(--v-theme-warning)) 14%, transparent);
}

.booking-block--completed {
  border-left-color: rgb(var(--v-theme-success));
  background-color: color-mix(in srgb, rgb(var(--v-theme-success)) 12%, transparent);
}

.booking-block--no_show {
  border-left-color: rgb(var(--v-theme-error));
  background-color: color-mix(in srgb, rgb(var(--v-theme-error)) 10%, transparent);
  text-decoration: line-through;
}
</style>
