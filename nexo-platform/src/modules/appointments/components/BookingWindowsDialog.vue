<template>
  <v-dialog :model-value="visible" max-width="520" @update:model-value="emit('close')">
    <v-card>
      <v-card-title class="text-h6">
        {{ editing ? 'Editar Ventana' : 'Nueva Ventana de Disponibilidad' }}
      </v-card-title>
      <v-card-text>
        <v-row dense>
          <v-col cols="12">
            <EmployeeSelect
              v-model="form.employee_id"
              label="Empleado (opcional)"
              clearable
              class="mb-1"
            />
          </v-col>
        </v-row>

        <v-row dense>
          <v-col cols="12">
            <v-select
              v-model="form.service_id"
              :items="serviceOptions"
              item-title="text"
              item-value="value"
              label="Servicio (opcional)"
              clearable
              density="compact"
              class="mb-1"
            />
          </v-col>
        </v-row>

        <v-row dense>
          <v-col cols="6">
            <v-text-field
              v-model="form.start_date"
              label="Desde"
              type="date"
              density="compact"
            />
          </v-col>
          <v-col cols="6">
            <v-text-field
              v-model="form.end_date"
              label="Hasta"
              type="date"
              density="compact"
            />
          </v-col>
        </v-row>

        <v-row dense>
          <v-col cols="6">
            <v-text-field
              v-model="form.start_time"
              label="Hora inicio"
              type="time"
              density="compact"
            />
          </v-col>
          <v-col cols="6">
            <v-text-field
              v-model="form.end_time"
              label="Hora fin"
              type="time"
              density="compact"
            />
          </v-col>
        </v-row>

        <v-select
          v-model="form.slot_mode"
          :items="slotModes"
          item-title="label"
          item-value="value"
          label="Modo"
          density="compact"
        />

        <v-alert
          type="info"
          variant="tonal"
          density="compact"
          class="mt-2"
        >
          Las ventanas de disponibilidad tienen <strong>prioridad sobre los horarios recurrentes</strong>
          del empleado. Si existe una ventana para la fecha seleccionada, se usará en lugar del schedule.
        </v-alert>
      </v-card-text>
      <v-card-actions class="pa-4 pt-0">
        <v-spacer />
        <v-btn variant="text" @click="emit('close')">Cancelar</v-btn>
        <v-btn
          color="primary"
          variant="flat"
          :disabled="!isValid"
          @click="onSave"
        >
          {{ editing ? 'Guardar' : 'Crear' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { reactive, computed, watch, onMounted } from 'vue';
import { useServiceStore } from '../stores/service.store';
import EmployeeSelect from './EmployeeSelect.vue';
import type { BookingWindow } from '../types/booking.types';

const props = defineProps<{
  visible: boolean;
  window?: BookingWindow | null;
}>();

const emit = defineEmits<{
  close: [];
  save: [data: any];
}>();

const serviceStore = useServiceStore();

const slotModes = [
  { label: 'Fijo (auto-genera)', value: 'fixed' },
  { label: 'Flexible (ventanas)', value: 'flexible' },
];

const form = reactive({
  employee_id: null as string | null,
  service_id: null as string | null,
  start_date: '',
  end_date: '',
  start_time: '08:00',
  end_time: '18:00',
  slot_mode: 'fixed' as 'fixed' | 'flexible',
  slot_interval_minutes: 30,
  buffer_before_minutes: 0,
  buffer_after_minutes: 0,
});

const serviceOptions = computed(() =>
  serviceStore.activeServices.map((s) => ({
    value: s.id,
    text: `${s.name} (${s.duration_minutes} min)`,
  })),
);

const editing = computed(() => !!props.window?.id);

const isValid = computed(() => {
  return form.start_date && form.end_date && form.start_date <= form.end_date &&
    form.start_time && form.end_time && form.start_time < form.end_time;
});

function onSave() {
  if (!isValid.value) return;
  emit('save', {
    ...form,
    id: props.window?.id,
  });
}

onMounted(() => {
  if (!serviceStore.activeServices.length) {
    serviceStore.fetchServices();
  }
});

watch(
  () => props.visible,
  (v) => {
    if (v && props.window) {
      form.employee_id = props.window.employee_id ?? null;
      form.service_id = props.window.service_id ?? null;
      form.start_date = props.window.start_date;
      form.end_date = props.window.end_date;
      form.start_time = props.window.start_time;
      form.end_time = props.window.end_time;
      form.slot_mode = props.window.slot_mode ?? 'fixed';
      form.slot_interval_minutes = props.window.slot_interval_minutes ?? 30;
      form.buffer_before_minutes = props.window.buffer_before_minutes ?? 0;
      form.buffer_after_minutes = props.window.buffer_after_minutes ?? 0;
    } else if (v) {
      form.employee_id = null;
      form.service_id = null;
      form.start_date = '';
      form.end_date = '';
      form.start_time = '08:00';
      form.end_time = '18:00';
      form.slot_mode = 'fixed';
      form.slot_interval_minutes = 30;
      form.buffer_before_minutes = 0;
      form.buffer_after_minutes = 0;
    }
  },
);
</script>
