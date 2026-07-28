<template>
  <div>
    <v-switch
      v-model="enabled"
      label="Cita recurrente"
      color="primary"
      class="mb-2"
    />

    <div v-if="enabled" class="pa-3 rounded" style="background: rgb(var(--v-theme-surface-variant))">
      <v-select
        v-model="form.frequency"
        :items="frequencyOptions"
        item-title="text"
        item-value="value"
        label="Frecuencia"
        density="compact"
        hide-details
        class="mb-2"
        @update:model-value="onFrequencyChange"
      />

      <v-select
        v-if="form.frequency === 'weekly' || form.frequency === 'biweekly'"
        v-model="form.day_of_week"
        :items="weekdayOptions"
        item-title="text"
        item-value="value"
        label="Día de la semana"
        density="compact"
        hide-details
        class="mb-2"
      />

      <v-text-field
        v-if="form.frequency === 'monthly'"
        v-model.number="form.day_of_month"
        label="Día del mes"
        type="number"
        :min="1"
        :max="31"
        density="compact"
        hide-details
        class="mb-2"
      />

      <v-text-field
        v-model="form.preferred_time"
        label="Hora preferida"
        type="time"
        density="compact"
        hide-details
        class="mb-2"
      />

      <v-row dense class="mt-1">
        <v-col cols="6">
          <v-text-field
            v-model="form.start_date"
            label="Desde"
            type="date"
            :min="minDate"
            density="compact"
            hide-details
          />
        </v-col>
        <v-col cols="6">
          <v-text-field
            v-model="form.end_date"
            label="Hasta"
            type="date"
            :min="form.start_date || minDate"
            density="compact"
            hide-details
          />
        </v-col>
      </v-row>

      <div v-if="estimatedCount > 0" class="text-caption text-medium-emphasis mt-2">
        Se generarán ~{{ estimatedCount }} citas
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';

export interface RecurrenceData {
  enabled: boolean;
  frequency: 'weekly' | 'biweekly' | 'monthly';
  day_of_week: number | null;
  day_of_month: number | null;
  preferred_time: string;
  start_date: string;
  end_date: string;
}

const props = defineProps<{
  modelValue: RecurrenceData;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: RecurrenceData];
}>();

const enabled = ref(props.modelValue.enabled);
const minDate = new Date().toISOString().split('T')[0];

const form = reactive<{
  frequency: 'weekly' | 'biweekly' | 'monthly';
  day_of_week: number | null;
  day_of_month: number | null;
  preferred_time: string;
  start_date: string;
  end_date: string;
}>({
  frequency: props.modelValue.frequency || 'weekly',
  day_of_week: props.modelValue.day_of_week ?? new Date().getDay(),
  day_of_month: props.modelValue.day_of_month ?? 1,
  preferred_time: props.modelValue.preferred_time || '09:00',
  start_date: props.modelValue.start_date || minDate,
  end_date: props.modelValue.end_date || '',
});

const frequencyOptions = [
  { value: 'weekly', text: 'Semanal' },
  { value: 'biweekly', text: 'Quincenal' },
  { value: 'monthly', text: 'Mensual' },
];

const weekdayOptions = [
  { value: 0, text: 'Domingo' },
  { value: 1, text: 'Lunes' },
  { value: 2, text: 'Martes' },
  { value: 3, text: 'Miércoles' },
  { value: 4, text: 'Jueves' },
  { value: 5, text: 'Viernes' },
  { value: 6, text: 'Sábado' },
];

function onFrequencyChange() {
  if (form.frequency === 'monthly') {
    form.day_of_week = null;
  } else {
    form.day_of_month = null;
  }
}

const estimatedCount = computed(() => {
  if (!form.start_date || !form.end_date) return 0;
  const start = new Date(form.start_date);
  const end = new Date(form.end_date);
  const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return 0;

  if (form.frequency === 'weekly') return Math.floor(diffDays / 7) + 1;
  if (form.frequency === 'biweekly') return Math.floor(diffDays / 14) + 1;
  if (form.frequency === 'monthly') return Math.floor(diffDays / 30) + 1;
  return 0;
});

function getData(): RecurrenceData {
  return {
    enabled: enabled.value,
    frequency: form.frequency,
    day_of_week: form.day_of_week,
    day_of_month: form.day_of_month,
    preferred_time: form.preferred_time,
    start_date: form.start_date,
    end_date: form.end_date,
  };
}

defineExpose({ getData });
</script>
