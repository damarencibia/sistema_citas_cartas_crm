<template>
  <v-chip
    :color="color"
    size="small"
    variant="tonal"
    class="font-weight-medium status-badge"
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
  active: { label: 'Activo', color: 'success', icon: 'mdi-check-circle-outline' },
  inactive: { label: 'Inactivo', color: 'grey', icon: 'mdi-minus-circle-outline' },
  confirmed: { label: 'Confirmada', color: 'info', icon: 'mdi-check-circle-outline' },
  in_progress: { label: 'En Progreso', color: 'warning', icon: 'mdi-progress-clock' },
  completed: { label: 'Completada', color: 'success', icon: 'mdi-check-all' },
  no_show: { label: 'No Asistió', color: 'error', icon: 'mdi-cancel' },
  cancelled: { label: 'Cancelada', color: 'grey', icon: 'mdi-close-circle-outline' },
  pending: { label: 'Pendiente', color: 'warning', icon: 'mdi-clock-outline' },
  preparing: { label: 'Preparando', color: 'info', icon: 'mdi-food-outline' },
  ready: { label: 'Listo', color: 'success', icon: 'mdi-check' },
  delivered: { label: 'Entregado', color: 'success', icon: 'mdi-check-all' },
  trial: { label: 'Prueba', color: 'info', icon: 'mdi-star-outline' },
  suspended: { label: 'Suspendido', color: 'error', icon: 'mdi-block-helper' },
  // Estados de eventos y aprobaciones de reservas (antes caían en snake_case crudo)
  waitlisted: { label: 'En Espera', color: 'warning', icon: 'mdi-clock-alert' },
  attended: { label: 'Asistió', color: 'info', icon: 'mdi-check-all' },
  approved: { label: 'Aprobada', color: 'success', icon: 'mdi-check-circle-outline' },
  rejected: { label: 'Rechazada', color: 'error', icon: 'mdi-close-circle-outline' },
};

/**
 * Fallback legible para estados no mapeados: `payment_pending` → `Payment pending`.
 */
function humanize(status: string): string {
  const text = status.replace(/_/g, ' ').trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const config = computed(
  () => statusMap[props.status] || { label: humanize(props.status), color: 'grey', icon: '' },
);
const label = computed(() => config.value.label);
const color = computed(() => config.value.color);
const icon = computed(() => config.value.icon);
</script>
