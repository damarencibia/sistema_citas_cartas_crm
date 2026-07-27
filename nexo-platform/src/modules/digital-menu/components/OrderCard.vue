<template>
  <v-card class="mb-4">
    <v-card-title>
      <div>
        <div class="text-subtitle-1 font-weight-medium">Pedido #{{ order.id.slice(0, 8) }}</div>
        <div class="text-caption text-medium-emphasis">Mesa {{ order.table?.number ?? 'N/D' }} · {{ order.status }}</div>
      </div>
      <v-spacer />
      <v-btn
        small
        text
        :disabled="!canAdvance"
        @click="handleChangeStatus">{{ nextStatusLabel }}</v-btn>
    </v-card-title>

    <v-card-text>
      <div v-for="item in order.items ?? []" :key="item.id" class="mb-3">
        <div class="d-flex justify-space-between">
          <div>{{ item.product_name }}</div>
          <div>{{ item.quantity }}×</div>
        </div>
        <div class="text-caption text-medium-emphasis">{{ item.variant_name || 'Sin variante' }}</div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Order } from '../types/order.types';
import type { OrderStatus } from '../types/order.types';

const props = defineProps<{ order: Order }>();
const emit = defineEmits<{
  (e: 'changeStatus', status: OrderStatus): void;
}>();

type FlowStatus = 'pending' | 'preparing' | 'ready' | 'delivered';
const statusFlow: readonly FlowStatus[] = ['pending', 'preparing', 'ready', 'delivered'] as const;

const currentIndex = computed(() => {
  const idx = statusFlow.indexOf(props.order.status as FlowStatus);
  return idx >= 0 ? idx : -1;
});

const canAdvance = computed(() => currentIndex.value >= 0 && currentIndex.value < statusFlow.length - 1);

const nextStatus = computed(() => {
  if (canAdvance.value) {
    return statusFlow[currentIndex.value + 1] as OrderStatus;
  }
  return props.order.status as OrderStatus;
});

const nextStatusLabel = computed(() => {
  if (!canAdvance.value) return 'Sin cambios disponibles';
  return nextStatus.value === 'preparing'
    ? 'Preparando'
    : nextStatus.value === 'ready'
      ? 'Listo'
      : nextStatus.value === 'delivered'
        ? 'Entregado'
        : 'Actualizar';
});

function handleChangeStatus() {
  if (canAdvance.value) {
    emit('changeStatus', nextStatus.value);
  }
}
</script>
