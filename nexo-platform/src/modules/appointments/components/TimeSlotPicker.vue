<template>
  <div class="time-slot-picker">
    <div class="text-body-2 text-medium-emphasis mb-2">{{ label }}</div>
    <v-progress-linear
      v-if="loading"
      indeterminate
      color="primary"
      class="mb-2"
    />

    <!-- AUTO / PREDEFINED MODE: chips -->
    <div v-else-if="hasChips" class="slots-grid">
      <v-chip
        v-for="slot in filteredChips"
        :key="slot.start_time"
        :color="slot.start_time === modelValue ? 'primary' : 'success'"
        :variant="slot.start_time === modelValue ? 'flat' : 'outlined'"
        size="small"
        class="ma-1"
        @click="onSelect(slot)"
      >
        {{ slot.start_time?.slice(0, 5) }} - {{ slot.end_time?.slice(0, 5) }}
        <span v-if="slot.capacity_remaining !== undefined && slot.capacity_remaining < 999" class="ml-1 text-caption">
          ({{ slot.capacity_remaining }})
        </span>
      </v-chip>
    </div>

    <!-- FLEXIBLE MODE: window range + time picker -->
    <div v-else-if="hasWindows" class="flexible-slots">
      <div v-for="(win, idx) in filteredWindows" :key="`win-${idx}`" class="mb-3">
        <v-chip
          color="orange"
          variant="tonal"
          prepend-icon="mdi-clock-outline"
          size="small"
          class="mb-1"
        >
          Disponible: {{ win.start_time?.slice(0, 5) }} - {{ win.end_time?.slice(0, 5) }}
        </v-chip>
        <div class="d-flex align-center ga-2 mt-1">
          <v-text-field
            :model-value="modelValue"
            label="Hora deseada"
            type="time"
            density="compact"
            hide-details
            :min="win.start_time?.slice(0, 5)"
            :max="maxSelectableTime(win)"
            @update:model-value="onWindowSelect($event)"
          />
          <v-btn
            v-if="modelValue"
            size="small"
            color="primary"
            variant="tonal"
            @click="onSelect({ start_time: modelValue, end_time: '', slot_type: 'window', capacity_remaining: 999 })"
          >
            Elegir
          </v-btn>
        </div>
      </div>
    </div>

    <div v-if="filteredSlots.length === 0 && !loading" class="text-body-2 text-medium-emphasis pa-4 text-center">
      No hay horarios disponibles para esta fecha
      <v-btn
        v-if="showWaitlist"
        size="small"
        color="warning"
        variant="tonal"
        prepend-icon="mdi-clock-outline"
        class="mt-2"
        block
        @click="emit('joinWaitlist')"
      >
        Unirse a la Lista de Espera
      </v-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { AvailableSlot } from '../types/booking.types';

const props = defineProps<{
  modelValue: string;
  slots: AvailableSlot[];
  date?: string;
  label?: string;
  loading?: boolean;
  showWaitlist?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
  joinWaitlist: [];
}>();

const isToday = computed(() => {
  if (!props.date) return false;
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return props.date === today;
});

const filteredSlots = computed(() => {
  if (!isToday.value || !props.date) return props.slots;

  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  return props.slots.filter((slot) => {
    const slotTime = slot.start_time?.slice(0, 5);
    return slotTime >= currentTime;
  });
});

const filteredChips = computed(() =>
  filteredSlots.value.filter((s) => s.slot_type === 'auto' || s.slot_type === 'predefined'),
);

const filteredWindows = computed(() =>
  filteredSlots.value.filter((s) => s.slot_type === 'window'),
);

const hasChips = computed(() => filteredChips.value.length > 0);
const hasWindows = computed(() => filteredWindows.value.length > 0);

function maxSelectableTime(win: AvailableSlot): string {
  if (!win.end_time) return '23:59';
  return win.end_time.slice(0, 5);
}

function onWindowSelect(time: string) {
  emit('update:modelValue', time);
}

function onSelect(slot: AvailableSlot) {
  emit('update:modelValue', slot.start_time);
}
</script>

<style scoped>
.slots-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
</style>
