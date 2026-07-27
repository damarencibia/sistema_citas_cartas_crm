<template>
  <div class="public-layout">
    <v-container class="py-8" max-width="800">
      <v-card class="pa-6">
        <div class="text-center mb-6">
          <v-icon size="64" color="primary" class="mb-4">mdi-clipboard-list</v-icon>
          <h2 class="text-h5 font-weight-bold mb-2">Seguimiento de Pedido</h2>
          <p class="text-body-1 text-medium-emphasis">El estado de tu pedido se actualiza en tiempo real</p>
        </div>

        <div v-if="loading" class="text-center py-8">
          <v-progress-circular indeterminate color="primary" />
        </div>

        <div v-else-if="order">
          <div class="mb-6">
            <div class="text-subtitle-1 font-weight-medium">Pedido #{{ order.id.slice(0, 8) }}</div>
            <div class="text-body-2 text-medium-emphasis">Mesa {{ order.table?.number ?? 'No asignada' }}</div>
            <div class="text-body-2 mt-2">
              <v-chip
                :color="statusColor(order.status)"
                text-color="white"
                size="small"
              >
                {{ statusLabel(order.status) }}
              </v-chip>
            </div>
          </div>

          <OrderStatusTimeline :order="order" />

          <v-divider class="my-6" />

          <div>
            <div class="text-subtitle-2 font-weight-medium mb-2">Detalle del pedido</div>
            <div v-for="item in order.items ?? []" :key="item.id" class="mb-3">
              <div class="d-flex justify-space-between">
                <div>{{ item.product_name }}</div>
                <div>{{ item.quantity }} × {{ formatPrice(item.unit_price) }}</div>
              </div>
              <div class="text-caption text-medium-emphasis">{{ item.variant_name || 'Sin variante' }}</div>
            </div>
          </div>

          <v-divider class="my-6" />

          <div v-if="canCancelOrder" class="text-center">
            <v-btn
              color="error"
              variant="outlined"
              @click="cancelOrder"
              :loading="canceling"
            >
              Cancelar pedido
            </v-btn>
          </div>
        </div>

        <div v-else class="text-center py-8 text-medium-emphasis">
          No se encontró el pedido.
        </div>
      </v-card>
    </v-container>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { useTenantStore } from '@/shared/stores/tenant.store';
import { orderRepository } from '../repositories/order.repository';
import { supabase } from '@/shared/api/supabase.client';
import { useWebhooks } from '../composables/useWebhooks';
import OrderStatusTimeline from '../components/OrderStatusTimeline.vue';
import type { Order, OrderStatus } from '../types/order.types';

const route = useRoute();
const tenantStore = useTenantStore();
const { onOrderStatusChanged } = useWebhooks();
const order = ref<Order | null>(null);
const loading = ref(true);
const canceling = ref(false);
let unsubscribe: (() => void) | null = null;
let previousStatus: OrderStatus | null = null;

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: '⏳ Pendiente',
    preparing: '👨‍🍳 En preparación',
    ready: '✅ Listo',
    delivered: '🎉 Entregado',
    cancelled: '❌ Cancelado',
  };
  return labels[status] || status;
}

function statusColor(status: string) {
  const colors: Record<string, string> = {
    pending: 'warning',
    preparing: 'info',
    ready: 'success',
    delivered: 'success',
    cancelled: 'error',
  };
  return colors[status] || 'grey';
}

const canCancelOrder = computed(() => {
  return order.value && ['pending', 'preparing'].includes(order.value.status);
});

function formatPrice(value: number) {
  return value.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
}

async function loadOrder() {
  loading.value = true;
  try {
    const slug = route.params.slug as string;
    await tenantStore.fetchTenantBySlug(slug);
    const orderId = route.params.orderId as string;
    order.value = await orderRepository.getById(orderId);
    subscribeToOrderUpdates(orderId);
  } finally {
    loading.value = false;
  }
}

function subscribeToOrderUpdates(orderId: string) {
  const channel = supabase
    .channel(`order-${orderId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
      (payload) => {
        const newOrder = { ...order.value, ...payload.new } as Order;
        const oldStatus = previousStatus || order.value?.status;
        const newStatus = newOrder.status as OrderStatus;

        // Dispara webhook si el estado cambió
        if (oldStatus !== newStatus) {
          onOrderStatusChanged(
            orderId,
            newStatus,
            newOrder.customer_name || undefined,
            newOrder.table?.number || undefined
          );
          previousStatus = newStatus;
        }

        order.value = newOrder;
      }
    )
    .subscribe();
  unsubscribe = () => channel.unsubscribe();
}

async function cancelOrder() {
  if (!order.value) return;
  canceling.value = true;
  try {
    await orderRepository.updateStatus(order.value.id, 'cancelled');
    order.value.status = 'cancelled';
  } catch (error) {
    console.error('Error al cancelar pedido:', error);
  } finally {
    canceling.value = false;
  }
}

onMounted(loadOrder);
onUnmounted(() => {
  if (unsubscribe) unsubscribe();
});
</script>
