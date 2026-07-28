<template>
  <v-select
    :model-value="modelValue"
    :items="employees"
    item-title="displayName"
    item-value="id"
    :label="label"
    :rules="rules"
    :loading="loading"
    clearable
    @update:model-value="emit('update:modelValue', $event)"
  >
    <template #item="{ props: itemProps, item }">
      <v-list-item v-bind="itemProps">
        <template #prepend>
          <div class="color-dot mr-3" :style="{ backgroundColor: item.raw.color }" />
        </template>
      </v-list-item>
    </template>
    <template #selection="{ item }">
      <div class="d-flex align-center ga-2">
        <div class="color-dot" :style="{ backgroundColor: item.raw.color }" />
        <span>{{ item.raw.displayName }}</span>
      </div>
    </template>
  </v-select>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useEmployeeStore } from '../stores/employee.store';

const props = defineProps<{
  modelValue: string | null;
  label?: string;
  rules?: readonly ((v: string | null) => boolean | string)[];
  allowedIds?: string[];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string | null];
}>();

const employeeStore = useEmployeeStore();
const loading = computed(() => employeeStore.loading);

const employees = computed(() =>
  employeeStore.activeEmployees
    .filter((e) => !props.allowedIds || props.allowedIds.length === 0 || props.allowedIds.includes(e.id))
    .map((e) => ({
      ...e,
      displayName: `${e.first_name} ${e.last_name}`,
    })),
);
</script>

<style scoped>
.color-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
</style>
