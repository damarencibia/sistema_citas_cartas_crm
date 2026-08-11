<template>
  <v-dialog :model-value="visible" max-width="480" @update:model-value="emit('close')">
    <v-card>
      <v-card-title class="text-h6">
        {{ editing ? 'Editar Turno' : 'Agregar Turno' }}
      </v-card-title>
      <v-card-text>
        <div class="text-body-2 text-medium-emphasis mb-4">{{ dayLabel }}</div>

        <v-row>
          <v-col cols="12" sm="6">
            <v-text-field
              v-model="form.start_time"
              label="Hora inicio"
              type="time"
              :rules="[validateStart]"
              density="compact"
            />
          </v-col>
          <v-col cols="12" sm="6">
            <v-text-field
              v-model="form.end_time"
              label="Hora fin"
              type="time"
              :readonly="useDuration"
              :bg-color="useDuration ? 'grey-lighten-4' : undefined"
              :rules="[validateEnd]"
              density="compact"
              :hint="useDuration ? 'Calculado por duración' : undefined"
              :persistent-hint="useDuration"
            />
          </v-col>
        </v-row>

        <v-switch
          v-model="useDuration"
          label="Calcular por duración"
          color="primary"
          density="compact"
          hide-details
          class="mt-1 mb-2"
        />

        <v-expand-transition>
          <div v-if="useDuration">
            <v-row dense>
              <v-col cols="5">
                <v-select
                  v-model="durationUnit"
                  :items="durationUnits"
                  item-title="label"
                  item-value="value"
                  label="Unidad"
                  density="compact"
                  hide-details
                />
              </v-col>
              <v-col cols="7">
                <v-text-field
                  v-if="durationUnit !== 'hybrid'"
                  v-model="durationValue"
                  :label="durationUnit === 'minutes' ? 'Minutos' : 'Horas'"
                  type="number"
                  :min="1"
                  :step="durationUnit === 'hours' ? 0.5 : 1"
                  density="compact"
                  hide-details
                />
                <div v-else class="d-flex ga-2">
                  <v-text-field
                    v-model="durationHours"
                    label="Horas"
                    type="number"
                    min="0"
                    step="1"
                    density="compact"
                    hide-details
                  />
                  <v-text-field
                    v-model="durationMinutes"
                    label="Min"
                    type="number"
                    min="0"
                    max="59"
                    step="5"
                    density="compact"
                    hide-details
                  />
                </div>
              </v-col>
            </v-row>

            <div v-if="calculatedEndTime" class="mt-3 text-center">
              <v-chip color="primary" variant="tonal" prepend-icon="mdi-clock-outline">
                Fin: {{ calculatedEndTime }}
              </v-chip>
            </div>
          </div>
        </v-expand-transition>

        <v-divider class="my-3" />

        <div class="text-subtitle-2 mb-2">Configuración de Slots</div>

        <v-select
          v-model="form.slot_mode"
          :items="slotModes"
          item-title="label"
          item-value="value"
          label="Modo de slots"
          density="compact"
          hide-details
          class="mb-2"
          :hint="form.slot_mode === 'flexible' ? 'Los clientes eligen cualquier hora libre dentro del turno' : 'Los huecos se generan automáticamente a intervalos fijos'"
          persistent-hint
        />

        <v-text-field
          v-model.number="form.slot_interval_minutes"
          label="Duración de cada hueco (min)"
          type="number"
          :min="5"
          :max="480"
          :step="5"
          density="compact"
          hide-details
          class="mb-2"
          :disabled="form.slot_mode === 'flexible'"
          hint="Duración de cada cita que se genera dentro del turno"
          persistent-hint
        />

        <v-row dense class="mt-2">
          <v-col cols="12" sm="6">
            <v-text-field
              v-model.number="form.advance_booking_days"
              label="Días máx. anticipación"
              type="number"
              :min="1"
              :max="365"
              density="compact"
              hide-details
              hint="Cuántos días adelante pueden reservar"
              persistent-hint
            />
          </v-col>
          <v-col cols="12" sm="6">
            <v-text-field
              v-model.number="form.min_advance_minutes"
              label="Mín. anticipación (min)"
              type="number"
              :min="0"
              :max="4320"
              density="compact"
              hide-details
              hint="Tiempo mínimo antes de la cita para reservar"
              persistent-hint
            />
          </v-col>
        </v-row>

        <v-alert
          v-if="overlapError"
          type="error"
          variant="tonal"
          density="compact"
          class="mt-2"
          icon="mdi-alert"
        >
          Este horario se superpone con otro turno existente.
        </v-alert>
      </v-card-text>
      <v-card-actions class="pa-4 pt-0">
        <v-spacer />
        <v-btn variant="text" @click="emit('close')">Cancelar</v-btn>
        <v-btn
          color="primary"
          variant="flat"
          :disabled="!isValid || overlapError"
          @click="onSave"
        >
          Guardar
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue';

interface ShiftForm {
  start_time: string;
  end_time: string;
  slot_mode: 'fixed' | 'flexible';
  slot_interval_minutes: number;
  advance_booking_days: number;
  min_advance_minutes: number;
}

const props = defineProps<{
  visible: boolean;
  dayLabel: string;
  start_time?: string;
  end_time?: string;
  slot_mode?: 'fixed' | 'flexible';
  slot_interval_minutes?: number;
  advance_booking_days?: number;
  min_advance_minutes?: number;
  existingShifts: { start_time: string; end_time: string }[];
}>();

const emit = defineEmits<{
  close: [];
  save: [data: ShiftForm];
}>();

const editing = ref(false);

const form = reactive<ShiftForm>({
  start_time: '09:00',
  end_time: '17:00',
  slot_mode: 'fixed',
  slot_interval_minutes: 30,
  advance_booking_days: 7,
  min_advance_minutes: 15,
});

const slotModes = [
  { label: 'Fijo (auto-genera)', value: 'fixed' },
  { label: 'Flexible (ventanas)', value: 'flexible' },
];

const durationUnits = [
  { label: 'Minutos', value: 'minutes' },
  { label: 'Horas', value: 'hours' },
  { label: 'Híbrido', value: 'hybrid' },
];

const useDuration = ref(false);
const durationUnit = ref<'minutes' | 'hours' | 'hybrid'>('hours');
const durationValue = ref<string>('');
const durationHours = ref<string>('');
const durationMinutes = ref<string>('');

const calculatedEndTime = computed(() => {
  if (!form.start_time) return null;

  const [startH, startM] = form.start_time.split(':').map(Number);
  let totalMinutes = 0;

  if (durationUnit.value === 'minutes') {
    const val = Number(durationValue.value);
    if (!val || val <= 0) return null;
    totalMinutes = val;
  } else if (durationUnit.value === 'hours') {
    const val = Number(durationValue.value);
    if (!val || val <= 0) return null;
    totalMinutes = Math.round(val * 60);
  } else {
    const h = Number(durationHours.value) || 0;
    const m = Number(durationMinutes.value) || 0;
    if (h === 0 && m === 0) return null;
    totalMinutes = h * 60 + m;
  }

  const totalStartMinutes = startH * 60 + startM + totalMinutes;
  if (totalStartMinutes > 24 * 60) return '23:59';
  if (totalStartMinutes <= 0) return null;

  const endH = Math.floor(totalStartMinutes / 60);
  const endM = totalStartMinutes % 60;
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
});

function resetDuration() {
  useDuration.value = false;
  durationUnit.value = 'hours';
  durationValue.value = '';
  durationHours.value = '';
  durationMinutes.value = '';
}

const isValid = computed(() => {
  return form.start_time && form.end_time && form.start_time < form.end_time;
});

const overlapError = computed(() => {
  if (!form.start_time || !form.end_time) return false;
  return props.existingShifts.some((s) => {
    return form.start_time < s.end_time && form.end_time > s.start_time;
  });
});

function validateStart(v: string) {
  return !!v || 'Requerido';
}

function validateEnd(v: string) {
  if (!v) return 'Requerido';
  if (form.start_time && v <= form.start_time) return 'Debe ser posterior a la hora de inicio';
  return true;
}

function onSave() {
  if (!isValid.value || overlapError.value) return;
  emit('save', { ...form });
}

watch(useDuration, (on) => {
  if (on && calculatedEndTime.value) {
    form.end_time = calculatedEndTime.value;
  }
});

watch(calculatedEndTime, (v) => {
  if (useDuration.value && v) {
    form.end_time = v;
  }
});

watch(
  () => props.visible,
  (v) => {
    if (v) {
      editing.value = !!props.start_time;
      form.start_time = props.start_time ?? '09:00';
      form.end_time = props.end_time ?? '17:00';
      form.slot_mode = props.slot_mode ?? 'fixed';
      form.slot_interval_minutes = props.slot_interval_minutes ?? 30;
      form.advance_booking_days = props.advance_booking_days ?? 7;
      form.min_advance_minutes = props.min_advance_minutes ?? 15;
      resetDuration();
    }
  },
);
</script>
