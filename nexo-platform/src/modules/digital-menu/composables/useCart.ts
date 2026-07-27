import { useCartStore } from '../stores/cart.store';
import { computed } from 'vue';

export function useCart() {
  const cartStore = useCartStore();

  return {
    items: computed(() => cartStore.items),
    totalItems: computed(() => cartStore.totalItems),
    subtotal: computed(() => cartStore.subtotal),
    customerInfo: computed(() => cartStore.customerInfo),
    tableId: computed(() => cartStore.tableId),
    addItem: cartStore.addItem,
    removeItem: cartStore.removeItem,
    updateQuantity: cartStore.updateQuantity,
    clearCart: cartStore.clearCart,
    setCustomerInfo: cartStore.setCustomerInfo,
    setTableId: cartStore.setTableId,
  };
}
