<template>
  <label class="timefield" :class="{ 'timefield--invalid': invalid }">
    <span class="timefield__display">{{ display }}</span>
    <v-icon size="13" class="timefield__icon" aria-hidden="true">mdi-clock-outline</v-icon>
    <input
      class="timefield__input"
      type="time"
      :value="modelValue"
      :aria-label="ariaLabel"
      :aria-invalid="invalid || undefined"
      @click="openPicker"
      @input="onInput"
    >
  </label>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  modelValue: string;
  ariaLabel?: string;
  invalid?: boolean;
}>(), {
  ariaLabel: 'Hora',
  invalid: false,
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const display = computed(() => {
  const value = props.modelValue ?? '';
  const match = /^(\d{1,2}):(\d{2})/.exec(value);
  if (!match) return value || '--:--';
  const hour24 = Number(match[1]);
  const minutes = match[2];
  const suffix = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 || 12;
  return `${hour12}:${minutes} ${suffix}`;
});

function onInput(event: Event) {
  const value = (event.target as HTMLInputElement).value;
  emit('update:modelValue', value);
}

function openPicker(event: MouseEvent) {
  const input = event.target as HTMLInputElement;
  if (typeof input.showPicker !== 'function') return;
  try {
    input.showPicker();
  } catch {
    // Algunos navegadores solo permiten showPicker en gestos directos.
  }
}
</script>

<style scoped>
.timefield {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 44px;
  padding: 0 2px;
  border-bottom: 1px solid transparent;
  color: rgb(var(--v-theme-on-surface));
  cursor: pointer;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.timefield:focus-within {
  border-bottom-color: rgb(var(--v-theme-on-surface), 0.7);
  box-shadow: inset 0 -1px 0 rgb(var(--v-theme-on-surface), 0.7);
}

.timefield:active {
  background: rgb(var(--v-theme-on-surface), 0.04);
}

.timefield--invalid {
  border-bottom-color: rgb(var(--v-theme-error), 0.7);
}

.timefield__display {
  font-size: 13px;
  line-height: 1;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.timefield__icon {
  flex-shrink: 0;
  opacity: 0.45;
}

.timefield__input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}

@media (prefers-reduced-motion: reduce) {
  .timefield {
    transition: none;
  }
}
</style>
