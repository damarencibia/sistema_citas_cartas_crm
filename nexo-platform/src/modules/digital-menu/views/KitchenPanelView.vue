<template>
  <div>
    <PageHeader title="Panel de Cocina" subtitle="Gestión de pedidos en tiempo real" />

    <v-row>
      <v-col cols="12" md="4">
        <v-card class="pa-4" color="warning lighten-5">
          <div class="text-subtitle-1 font-weight-medium mb-4">
            ⏳ Pendientes ({{ pending.length }})
            <SoundControls />
          </div>
          <div v-if="pending.length === 0" class="text-center text-medium-emphasis py-4">Sin pedidos</div>
          <div v-for="order in pending" :key="order.id" class="mb-3">
            <OrderCard
              :order="order"
              @change-status="(status) => changeStatus(order.id, status)"
            />
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" md="4">
        <v-card class="pa-4" color="info lighten-5">
          <div class="text-subtitle-1 font-weight-medium mb-4">👨‍🍳 En preparación ({{ preparing.length }})</div>
          <div v-if="preparing.length === 0" class="text-center text-medium-emphasis py-4">Sin pedidos</div>
          <div v-for="order in preparing" :key="order.id" class="mb-3">
            <OrderCard
              :order="order"
              @change-status="(status) => changeStatus(order.id, status)"
            />
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" md="4">
        <v-card class="pa-4" color="success lighten-5">
          <div class="text-subtitle-1 font-weight-medium mb-4">✅ Listos ({{ ready.length }})</div>
          <div v-if="ready.length === 0" class="text-center text-medium-emphasis py-4">Sin pedidos</div>
          <div v-for="order in ready" :key="order.id" class="mb-3">
            <OrderCard
              :order="order"
              @change-status="(status) => changeStatus(order.id, status)"
            />
          </div>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import PageHeader from '@/shared/components/PageHeader.vue';
import OrderCard from '../components/OrderCard.vue';
import SoundControls from '../components/SoundControls.vue';
import { useOrderStore } from '../stores/order.store';
import { useAuthStore } from '@/shared/stores/auth.store';
import { useWebhooks } from '../composables/useWebhooks';
import type { OrderStatus } from '../types/order.types';

const orderStore = useOrderStore();
const authStore = useAuthStore();
const { onOrderStatusChanged, onOrderCreated } = useWebhooks();
const updating = ref<Set<string>>(new Set());
const observedOrderIds = ref<Set<string>>(new Set());

onMounted(async () => {
  const tenantId = authStore.user?.tenant_id ?? '';
  await orderStore.fetchOrders();
  // Registrar los pedidos iniciales
  orderStore.orders.forEach((order: any) => {
    observedOrderIds.value.add(order.id);
  });
  orderStore.subscribeToNewOrders(tenantId);
});

const pending = computed(() => orderStore.orders.filter((o: any) => o.status === 'pending'));
const preparing = computed(() => orderStore.orders.filter((o: any) => o.status === 'preparing'));
const ready = computed(() => orderStore.orders.filter((o: any) => o.status === 'ready'));

// Detectar nuevos pedidos
watch(
  () => orderStore.orders.length,
  () => {
    orderStore.orders.forEach((order: any) => {
      if (!observedOrderIds.value.has(order.id)) {
        // Es un nuevo pedido
        observedOrderIds.value.add(order.id);
        onOrderCreated(order.id, order.customer_name || 'Cliente', order.table?.number);
      }
    });
  }
);

async function changeStatus(orderId: string, status: OrderStatus) {
  updating.value.add(orderId);
  try {
    const order = orderStore.orders.find((o: any) => o.id === orderId);
    await orderStore.updateOrderStatus(orderId, status);

    // Dispara webhook después de actualizar
    onOrderStatusChanged(
      orderId,
      status,
      order?.customer_name || undefined,
      order?.table?.number || undefined
    );
  } finally {
    updating.value.delete(orderId);
  }
}
</script>
