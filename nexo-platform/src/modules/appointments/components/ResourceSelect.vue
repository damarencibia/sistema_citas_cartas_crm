<template>
  <v-select
    :model-value="modelValue"
    :items="resources"
    item-title="name"
    item-value="id"
    :label="label"
    :hint="selectedHint"
    persistent-hint
    density="compact"
    hide-details
    :rules="rules"
    clearable
    @update:model-value="emit('update:modelValue', $event)"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useResourceStore } from '../stores/resource.store';
import type { Resource } from '../types/resource.types';

const props = defineProps<{
  modelValue: string | null;
  serviceId?: string;
  label?: string;
  rules?: ((v: string | null) => boolean | string)[];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string | null];
}>();

const resourceStore = useResourceStore();

const resources = computed(() => resourceStore.activeResources);

const selectedHint = computed(() => {
  if (!props.modelValue) return '';
  const r = resources.value.find((res) => res.id === props.modelValue);
  if (!r) return '';
  return `${r.type} - Cap: ${r.capacity}`;
});
</script>
