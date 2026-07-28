<template>
  <div class="time-slot-picker">
    <div class="text-body-2 text-medium-emphasis mb-2">{{ label }}</div>
    <v-progress-linear
      v-if="loading"
      indeterminate
      color="primary"
      class="mb-2"
    />

    <!-- AUTO + PREDEFINED SLOTS GRID -->
    <div v-else-if="gridSlots.length > 0" class="slots-grid">
      <v-badge
        v-for="slot in gridSlots"
        :key="slot.start_time"
        :content="slot.waitlist_count"
        :model-value="slot.status === 'occupied' && (slot.waitlist_count ?? 0) > 0"
        color="error"
        size="small"
        offset="-4 4"
      >
        <v-chip
          :color="chipColor(slot)"
          :variant="chipVariant(slot)"
          :class="chipClass(slot)"
          size="small"
          class="ma-1"
          :disabled="slot.status === 'past'"
          @click="onSlotClick(slot)"
        >
          {{ slot.start_time?.slice(0, 5) }} - {{ slot.end_time?.slice(0, 5) }}
          <span v-if="slot.status === 'available' && slot.capacity_remaining < 999" class="ml-1 text-caption">
            ({{ slot.capacity_remaining }})
          </span>
        </v-chip>
      </v-badge>
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

    <!-- FLEXIBLE WAITLIST BUTTON -->
    <div v-if="hasOccupied && !loading" class="mt-2">
      <v-btn
        size="small"
        color="warning"
        variant="tonal"
        prepend-icon="mdi-clock-outline"
        block
        @click="emit('joinWaitlistFlexible')"
      >
        Modo flexible — Avísame cuando se libere cualquier horario
      </v-btn>
    </div>

    <!-- EMPTY STATE (no slots at all — do NOT offer waitlist) -->
    <div v-if="allSlots.length === 0 && !loading" class="text-body-2 text-medium-emphasis pa-4 text-center">
      No hay horarios disponibles para esta fecha
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
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
  joinWaitlist: [];
  joinWaitlistExact: [time: string];
  joinWaitlistFlexible: [];
}>();

const allSlots = computed(() => props.slots);

const gridSlots = computed(() =>
  allSlots.value.filter((s) => s.slot_type === 'auto' || s.slot_type === 'predefined'),
);

const filteredWindows = computed(() =>
  allSlots.value.filter((s) => s.slot_type === 'window'),
);

const hasWindows = computed(() => filteredWindows.value.length > 0);

const hasOccupied = computed(() =>
  gridSlots.value.some((s) => s.status === 'occupied'),
);

function chipColor(slot: AvailableSlot) {
  if (slot.status === 'occupied') return 'error';
  if (slot.status === 'past') return 'grey';
  if (slot.start_time === props.modelValue) return 'primary';
  return 'success';
}

function chipVariant(slot: AvailableSlot): 'outlined' | 'tonal' | 'flat' {
  if (slot.status === 'occupied') return 'outlined';
  if (slot.status === 'past') return 'tonal';
  if (slot.start_time === props.modelValue) return 'flat';
  return 'outlined';
}

function chipClass(slot: AvailableSlot): string {
  const classes: string[] = [];
  if (slot.status === 'occupied') classes.push('slot-occupied');
  if (slot.status === 'past') classes.push('slot-past');
  if (slot.status === 'available' && slot.start_time === props.modelValue) classes.push('slot-selected');
  return classes.join(' ');
}

function maxSelectableTime(win: AvailableSlot): string {
  if (!win.end_time) return '23:59';
  return win.end_time.slice(0, 5);
}

function onWindowSelect(time: string) {
  emit('update:modelValue', time);
}

function onSlotClick(slot: AvailableSlot) {
  if (slot.status === 'occupied') {
    emit('joinWaitlistExact', slot.start_time);
  } else if (slot.status === 'available') {
    emit('update:modelValue', slot.start_time);
  }
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

.slot-occupied {
  opacity: 0.65;
  border-color: rgba(244, 67, 54, 0.5) !important;
}

.slot-past {
  opacity: 0.4;
  cursor: default !important;
}
</style>
