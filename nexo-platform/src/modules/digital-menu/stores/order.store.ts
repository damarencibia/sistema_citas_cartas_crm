import { defineStore } from 'pinia';
import { supabase } from '@/shared/api/supabase.client';
import { orderRepository } from '../repositories/order.repository';
import { useAuthStore } from '@/shared/stores/auth.store';
import type { OrderStatus, CreateOrderDTO } from '../types/order.types';

interface OrderStoreState {
  orders: any[];
  currentOrder: any | null;
  loading: boolean;
}

export const useOrderStore = defineStore('digital-menu/orders', {
  state: (): OrderStoreState => ({
    orders: [],
    currentOrder: null,
    loading: false,
  }),

  getters: {},

  actions: {
    async fetchOrders() {
      const authStore = useAuthStore();
      const tenantId = authStore.user?.tenant_id;
      if (!tenantId) return;
      this.loading = true;
      try {
        this.orders = await orderRepository.getByTenant(tenantId);
      } finally {
        this.loading = false;
      }
    },

    async fetchOrderById(id: string) {
      this.loading = true;
      try {
        this.currentOrder = await orderRepository.getById(id);
      } finally {
        this.loading = false;
      }
      return this.currentOrder;
    },

    async createOrder(dto: CreateOrderDTO) {
      const created = await orderRepository.create(dto);
      this.orders.unshift(created);
      return created;
    },

    async updateOrderStatus(orderId: string, status: OrderStatus) {
      const updated = await orderRepository.updateStatus(orderId, status);
      const index = this.orders.findIndex((order) => order.id === updated.id);
      if (index !== -1) this.orders[index] = updated;
      if (this.currentOrder?.id === updated.id) this.currentOrder = updated;
      return updated;
    },

    subscribeToNewOrders(tenantId: string) {
      const channel = supabase
        .channel('public-orders')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders', filter: `tenant_id=eq.${tenantId}` }, (payload) => {
          const order = payload.new as any;
          this.orders.unshift(order);
        })
        .subscribe();
      return channel;
    },
  },
});
