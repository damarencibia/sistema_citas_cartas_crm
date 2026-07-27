<template>
  <v-timeline dense>
    <v-timeline-item
      v-for="step in statusSteps"
      :key="step.status"
      :color="step.color"
      :icon="step.icon"
      :title="step.label"
      :subtitle="stepAt(step.status)"
    />
  </v-timeline>
</template>

<script setup lang="ts">
import type { Order } from '../types/order.types';

const props = defineProps<{ order: Order }>();

const statusSteps: Array<{ status: string; label: string; icon: string; color: string }> = [
  { status: 'pending', label: 'Pendiente', icon: 'mdi-timer-sand', color: 'warning' },
  { status: 'preparing', label: 'Preparando', icon: 'mdi-silverware-fork-knife', color: 'info' },
  { status: 'ready', label: 'Listo', icon: 'mdi-check-circle', color: 'success' },
  { status: 'delivered', label: 'Entregado', icon: 'mdi-truck-delivery', color: 'grey' },
  { status: 'cancelled', label: 'Cancelado', icon: 'mdi-close-circle', color: 'error' },
];

function stepAt(status: string) {
  if (props.order.status === status) {
    return status === 'cancelled' ? 'Pedido cancelado' : 'Estado actual';
  }
  if (status === 'pending') return 'Pedido recibido';
  return '';
}
</script>
