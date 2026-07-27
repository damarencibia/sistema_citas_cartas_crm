import { ref, onBeforeUnmount } from 'vue';
import { supabase } from '@/shared/api/supabase.client';
import type { Order } from '../types/order.types';

export function useOrderTracking(orderId: string) {
  const order = ref<Order | null>(null);
  const channel = ref<any>(null);

  function subscribe(onUpdate: (next: Order) => void) {
    channel.value = supabase
      .channel(`order-${orderId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` }, (payload) => {
        onUpdate(payload.new as Order);
      })
      .subscribe();
  }

  onBeforeUnmount(() => {
    if (channel.value) {
      supabase.removeChannel(channel.value);
    }
  });

  return {
    order,
    subscribe,
  };
}
