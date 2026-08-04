<template>
  <v-dialog :model-value="visible" max-width="420" @update:model-value="emit('close')">
    <v-card>
      <v-card-title class="text-h6">
        Agregar Slot Predefinido
      </v-card-title>
      <v-card-text>
        <div class="text-body-2 text-medium-emphasis mb-4">{{ dayLabel }}</div>

        <v-select
          v-model="form.day_of_week"
          :items="dayOptions"
          item-title="label"
          item-value="value"
          label="Día"
          density="compact"
          hide-details
          class="mb-3"
        />

        <v-row>
          <v-col cols="12" sm="6">
            <v-text-field
              v-model="form.start_time"
              label="Hora inicio"
              type="time"
              density="compact"
            />
          </v-col>
          <v-col cols="12" sm="6">
            <v-text-field
              v-model="form.end_time"
              label="Hora fin"
              type="time"
              :rules="[validateEnd]"
              density="compact"
            />
          </v-col>
        </v-row>
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
          Agregar
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { reactive, computed, watch } from 'vue';

const props = defineProps<{
  visible: boolean;
  dayLabel?: string;
  initialDayOfWeek?: number;
}>();

const emit = defineEmits<{
  close: [];
  save: [data: { day_of_week: number; start_time: string; end_time: string }];
}>();

const dayOptions = [
  { label: 'Lunes', value: 1 },
  { label: 'Martes', value: 2 },
  { label: 'Miércoles', value: 3 },
  { label: 'Jueves', value: 4 },
  { label: 'Viernes', value: 5 },
  { label: 'Sábado', value: 6 },
  { label: 'Domingo', value: 0 },
];

const form = reactive({
  day_of_week: 1,
  start_time: '09:00',
  end_time: '09:30',
});

const isValid = computed(() => {
  return form.start_time && form.end_time && form.start_time < form.end_time;
});

function validateEnd(v: string) {
  if (!v) return 'Requerido';
  if (form.start_time && v <= form.start_time) return 'Debe ser posterior a la hora de inicio';
  return true;
}

function onSave() {
  if (!isValid.value) return;
  emit('save', { ...form });
}

watch(
  () => props.visible,
  (v) => {
    if (v) {
      form.day_of_week = props.initialDayOfWeek ?? 1;
      form.start_time = '09:00';
      form.end_time = '09:30';
    }
  },
);
</script>
