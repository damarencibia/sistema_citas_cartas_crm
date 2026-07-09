<template>
  <v-chip
    :color="color"
    :text-color="textColor"
    size="small"
    label
  >
    <v-icon v-if="icon" start :size="14">{{ icon }}</v-icon>
    {{ label }}
  </v-chip>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  status: string;
}>();

const statusMap: Record<string, { label: string; color: string; icon: string }> = {
  active: { label: 'Activo', color: 'success', icon: 'mdi-check-circle' },
  inactive: { label: 'Inactivo', color: 'grey', icon: 'mdi-minus-circle' },
  confirmed: { label: 'Confirmada', color: 'info', icon: 'mdi-check-circle' },
  in_progress: { label: 'En Progreso', color: 'warning', icon: 'mdi-progress-clock' },
  completed: { label: 'Completada', color: 'success', icon: 'mdi-check-all' },
  no_show: { label: 'No Asistió', color: 'error', icon: 'mdi-cancel' },
  cancelled: { label: 'Cancelada', color: 'grey', icon: 'mdi-close-circle' },
  pending: { label: 'Pendiente', color: 'warning', icon: 'mdi-clock-outline' },
  preparing: { label: 'Preparando', color: 'info', icon: 'mdi-food' },
  ready: { label: 'Listo', color: 'success', icon: 'mdi-check' },
  delivered: { label: 'Entregado', color: 'success', icon: 'mdi-check-all' },
  trial: { label: 'Prueba', color: 'info', icon: 'mdi-star' },
  suspended: { label: 'Suspendido', color: 'error', icon: 'mdi-block-helper' },
};

const config = computed(
  () => statusMap[props.status] || { label: props.status, color: 'grey', icon: '' },
);
const label = computed(() => config.value.label);
const color = computed(() => config.value.color);
const icon = computed(() => config.value.icon);
const textColor = computed(() => 'white');
</script>
