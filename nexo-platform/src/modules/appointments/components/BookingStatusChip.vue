<template>
  <v-chip :color="config.color" size="small" label>
    <v-icon start :size="14">{{ config.icon }}</v-icon>
    {{ config.label }}
  </v-chip>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { BookingStatus } from '../types/booking.types';

const props = defineProps<{
  status: BookingStatus;
}>();

const statusMap: Record<BookingStatus, { label: string; color: string; icon: string }> = {
  confirmed: { label: 'Confirmada', color: 'info', icon: 'mdi-check-circle' },
  in_progress: { label: 'En Progreso', color: 'warning', icon: 'mdi-progress-clock' },
  completed: { label: 'Completada', color: 'success', icon: 'mdi-check-all' },
  no_show: { label: 'No Asistió', color: 'error', icon: 'mdi-cancel' },
  cancelled: { label: 'Cancelada', color: 'grey', icon: 'mdi-close-circle' },
  pending_approval: { label: 'Pendiente Aprobación', color: 'amber', icon: 'mdi-clock-alert' },
  pending_confirmation: { label: 'Pendiente Confirmación', color: 'orange', icon: 'mdi-message-clock-outline' },
};

const config = computed(() => statusMap[props.status] ?? { label: props.status, color: 'grey', icon: 'mdi-help' });
</script>
