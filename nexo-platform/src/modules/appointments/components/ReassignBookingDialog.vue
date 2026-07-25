<template>
  <v-dialog :model-value="visible" max-width="480" @update:model-value="emit('close')">
    <v-card>
      <v-card-title class="text-h6 d-flex align-center">
        <v-icon color="primary" class="mr-2">mdi-calendar-switch</v-icon>
        Reasignar Cita
      </v-card-title>
      <v-card-text>
        <div v-if="booking" class="text-body-2 text-medium-emphasis mb-4">
          {{ booking.customer_name }} — {{ booking.service?.name }}
          <br>
          Horario actual: {{ booking.date }} {{ booking.start_time?.slice(0, 5) }} - {{ booking.end_time?.slice(0, 5) }}
        </div>

        <v-row>
          <v-col cols="6">
            <v-text-field
              v-model="newDate"
              label="Nueva fecha"
              type="date"
              :min="minDate"
              density="compact"
            />
          </v-col>
          <v-col cols="6">
            <v-text-field
              v-model="newTime"
              label="Nueva hora"
              type="time"
              density="compact"
              :error="timeConflict"
              :error-messages="timeConflict ? 'Horario en conflicto con otro turno existente' : ''"
            />
          </v-col>
        </v-row>

        <div v-if="existingBookings.length > 0" class="mt-2">
          <div class="text-caption text-medium-emphasis mb-1">Turnos existentes del empleado para esta fecha:</div>
          <v-chip
            v-for="b in existingBookings"
            :key="b.id"
            size="small"
            :color="isConflict(b) ? 'error' : 'grey'"
            variant="tonal"
            class="ma-1"
          >
            {{ b.start_time?.slice(0, 5) }} - {{ b.end_time?.slice(0, 5) }}
            <span class="ml-1 text-caption">({{ b.customer_name }})</span>
          </v-chip>
        </div>

        <v-alert
          v-if="timeConflict"
          type="error"
          variant="tonal"
          density="compact"
          class="mt-3"
          icon="mdi-alert"
        >
          La hora seleccionada se superpone con un turno existente. Elige otro horario.
        </v-alert>

        <v-alert
          v-if="noSlots"
          type="warning"
          variant="tonal"
          density="compact"
          class="mt-3"
        >
          No hay turnos disponibles del empleado para esta fecha.
        </v-alert>
      </v-card-text>
      <v-card-actions class="pa-4 pt-0">
        <v-spacer />
        <v-btn variant="text" @click="emit('close')">Cancelar</v-btn>
        <v-btn
          color="primary"
          variant="flat"
          :loading="loading"
          :disabled="timeConflict || noSlots || !newDate || !newTime"
          @click="onConfirm"
        >
          Reasignar
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useBookingStore } from '../stores/booking.store';
import type { Booking } from '../types/booking.types';

const props = defineProps<{
  visible: boolean;
  booking: Booking | null;
}>();

const emit = defineEmits<{
  close: [];
  confirm: [data: { newDate: string; newStartTime: string }];
}>();

const bookingStore = useBookingStore();
const loading = ref(false);
const newDate = ref('');
const newTime = ref('');
const existingBookings = ref<Booking[]>([]);
const minDate = new Date().toISOString().split('T')[0];

const newEndTime = computed(() => {
  if (!props.booking || !newTime.value) return '';
  const [h, m] = newTime.value.split(':').map(Number);
  const duration = props.booking.service?.duration_minutes ?? 30;
  const end = new Date(2000, 0, 1, h, m + duration);
  return `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;
});

const timeConflict = computed(() => {
  if (!newTime.value || !newEndTime.value) return false;
  return existingBookings.value.some((b) => {
    const bStart = b.start_time?.slice(0, 5);
    const bEnd = b.end_time?.slice(0, 5);
    return newTime.value < bEnd && newEndTime.value > bStart;
  });
});

const noSlots = computed(() => {
  if (!newDate.value) return false;
  return existingBookings.value.length === 0 && newDate.value === props.booking?.date;
});

function isConflict(b: Booking): boolean {
  if (!newTime.value || !newEndTime.value) return false;
  const bStart = b.start_time?.slice(0, 5);
  const bEnd = b.end_time?.slice(0, 5);
  return newTime.value < bEnd && newEndTime.value > bStart;
}

async function loadExistingBookings() {
  if (!props.booking || !newDate.value) {
    existingBookings.value = [];
    return;
  }
  existingBookings.value = await bookingStore.fetchBookingsForEmployee(
    props.booking.employee_id,
    newDate.value,
  );
}

function onConfirm() {
  if (!newDate.value || !newTime.value || timeConflict.value) return;
  emit('confirm', { newDate: newDate.value, newStartTime: newTime.value });
}

watch(
  () => props.visible,
  (v) => {
    if (v && props.booking) {
      newDate.value = props.booking.date;
      newTime.value = props.booking.start_time?.slice(0, 5) ?? '';
      loadExistingBookings();
    }
  },
);

watch(newDate, () => {
  if (props.visible) loadExistingBookings();
});
</script>
