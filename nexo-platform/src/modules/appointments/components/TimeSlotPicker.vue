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
          :disabled="slot.status === 'past' || (waitlistMode && slot.status === 'available')"
          @click="onSlotClick(slot)"
        >
          {{ slot.start_time?.slice(0, 5) }} - {{ slot.end_time?.slice(0, 5) }}
          <span v-if="slot.status === 'available' && slot.capacity_remaining < 999 && !waitlistMode" class="ml-1 text-caption">
            ({{ slot.capacity_remaining }})
          </span>
          <v-icon v-if="waitlistMode && slot.status === 'occupied' && isWaitlistSelected(slot)" size="small" class="ml-1">
            mdi-check
          </v-icon>
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

    <!-- WAITLIST MODE TOGGLE (shown when there are occupied slots) -->
    <div v-if="hasOccupied && !loading" class="mt-2">
      <v-btn
        size="small"
        :color="waitlistMode ? 'primary' : 'warning'"
        :variant="waitlistMode ? 'flat' : 'tonal'"
        :prepend-icon="waitlistMode ? 'mdi-close' : 'mdi-clock-outline'"
        block
        @click="toggleWaitlistMode"
      >
        {{ waitlistMode ? 'Volver a horarios disponibles' : 'Modo flexible — Elige horarios ocupados para la lista de espera' }}
      </v-btn>
      <div v-if="waitlistMode" class="text-caption text-medium-emphasis mt-1 text-center">
        Selecciona uno o varios horarios ocupados. Te avisaremos cuando alguno se libere.
      </div>
    </div>

    <!-- EMPTY STATE (no slots at all — do NOT offer waitlist) -->
    <div v-if="allSlots.length === 0 && !loading" class="text-body-2 text-medium-emphasis pa-4 text-center">
      No hay horarios disponibles para esta fecha
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { AvailableSlot } from '../types/booking.types';

const props = withDefaults(
  defineProps<{
    modelValue: string;
    slots: AvailableSlot[];
    date?: string;
    label?: string;
    loading?: boolean;
    waitlistTimes?: string[];
  }>(),
  {
    date: undefined,
    label: '',
    loading: false,
    waitlistTimes: () => [],
  },
);

const emit = defineEmits<{
  'update:modelValue': [value: string];
  'update:waitlistTimes': [value: string[]];
}>();

const waitlistMode = ref(false);

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

function isWaitlistSelected(slot: AvailableSlot): boolean {
  return props.waitlistTimes.includes(slot.start_time);
}

function chipColor(slot: AvailableSlot) {
  if (slot.status === 'past') return 'grey';
  if (waitlistMode.value) {
    if (slot.status === 'occupied') return 'error';
    return 'grey';
  }
  if (slot.status === 'occupied') return 'error';
  if (slot.start_time === props.modelValue) return 'primary';
  return 'success';
}

function chipVariant(slot: AvailableSlot): 'outlined' | 'tonal' | 'flat' {
  if (slot.status === 'past') return 'tonal';
  if (waitlistMode.value) {
    if (slot.status === 'occupied') return isWaitlistSelected(slot) ? 'flat' : 'outlined';
    return 'tonal';
  }
  if (slot.status === 'occupied') return 'outlined';
  if (slot.start_time === props.modelValue) return 'flat';
  return 'outlined';
}

function chipClass(slot: AvailableSlot): string {
  const classes: string[] = [];
  if (slot.status === 'past') classes.push('slot-past');
  if (waitlistMode.value) {
    if (slot.status === 'occupied') {
      classes.push('slot-waitlist-selectable');
      if (isWaitlistSelected(slot)) classes.push('slot-waitlist-selected');
    } else {
      classes.push('slot-dimmed');
    }
  } else {
    if (slot.status === 'occupied') classes.push('slot-occupied');
    if (slot.status === 'available' && slot.start_time === props.modelValue) classes.push('slot-selected');
  }
  return classes.join(' ');
}

function maxSelectableTime(win: AvailableSlot): string {
  if (!win.end_time) return '23:59';
  return win.end_time.slice(0, 5);
}

function onWindowSelect(time: string) {
  emit('update:modelValue', time);
}

function toggleWaitlistTime(time: string) {
  const current = props.waitlistTimes;
  const next = current.includes(time)
    ? current.filter((t) => t !== time)
    : [...current, time];
  emit('update:waitlistTimes', next);
}

function toggleWaitlistMode() {
  waitlistMode.value = !waitlistMode.value;
  if (waitlistMode.value) {
    emit('update:modelValue', '');
  } else {
    emit('update:waitlistTimes', []);
  }
}

function onSlotClick(slot: AvailableSlot) {
  if (slot.status === 'past') return;
  if (waitlistMode.value) {
    if (slot.status === 'occupied') toggleWaitlistTime(slot.start_time);
    return;
  }
  if (slot.status === 'available') {
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

.slot-dimmed {
  opacity: 0.45;
  cursor: default !important;
}

.slot-waitlist-selectable {
  opacity: 1;
  border-color: rgba(244, 67, 54, 0.7) !important;
  box-shadow: 0 0 6px rgba(244, 67, 54, 0.35);
}

.slot-waitlist-selected {
  opacity: 1;
  box-shadow: 0 0 10px rgba(244, 67, 54, 0.55);
}
</style>
