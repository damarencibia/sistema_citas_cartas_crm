<template>
  <div>
    <PageHeader title="Panel de Pedidos" subtitle="Gestiona los pedidos en tiempo real" />
    <v-row>
      <v-col
        v-for="column in columns"
        :key="column.status"
        cols="12"
        md="3"
      >
        <v-card class="pa-4" elevation="1">
          <div class="d-flex justify-space-between align-center mb-4">
            <div>
              <div class="text-subtitle-1 font-weight-medium">{{ column.label }}</div>
              <div class="text-caption text-medium-emphasis">{{ column.orders.length }} pedidos</div>
            </div>
          </div>
          <OrderCard
            v-for="order in column.orders"
            :key="order.id"
            :order="order"
            @change-status="(status) => updateStatus(order.id, status)"
          />
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue';
import PageHeader from '@/shared/components/PageHeader.vue';
import OrderCard from '../components/OrderCard.vue';
import { useOrderStore } from '../stores/order.store';

const orderStore = useOrderStore();

onMounted(async () => {
  await orderStore.fetchOrders();
});

const columns = computed(() => [
  { status: 'pending', label: 'Pendientes', orders: orderStore.orders.filter((order) => order.status === 'pending') },
  { status: 'preparing', label: 'Preparando', orders: orderStore.orders.filter((order) => order.status === 'preparing') },
  { status: 'ready', label: 'Listos', orders: orderStore.orders.filter((order) => order.status === 'ready') },
  { status: 'delivered', label: 'Entregados', orders: orderStore.orders.filter((order) => order.status === 'delivered') },
]);

function updateStatus(orderId: string, status: string) {
  orderStore.updateOrderStatus(orderId, status as any);
}
</script>
