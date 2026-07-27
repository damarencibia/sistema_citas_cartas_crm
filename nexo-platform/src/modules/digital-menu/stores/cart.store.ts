import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { CartItem, CustomerInfo } from '../types/cart.types';

const CART_STORAGE_KEY = 'digital-menu-cart';

function loadCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export const useCartStore = defineStore('digital-menu/cart', () => {
  const items = ref<CartItem[]>(loadCart());
  const customerInfo = ref<CustomerInfo | null>(null);
  const tableId = ref<string | null>(null);

  const totalItems = computed(() => items.value.reduce((sum, item) => sum + item.quantity, 0));
  const subtotal = computed(() =>
    items.value.reduce((sum, item) => sum + (item.unitPrice + item.extrasPrice) * item.quantity, 0),
  );

  function persist() {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items.value));
  }

  function addItem(item: CartItem) {
    const existing = items.value.find(
      (entry) =>
        entry.productId === item.productId &&
        entry.variantName === item.variantName &&
        JSON.stringify(entry.extras) === JSON.stringify(item.extras) &&
        entry.notes === item.notes,
    );
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      items.value.push(item);
    }
    persist();
  }

  function removeItem(index: number) {
    items.value.splice(index, 1);
    persist();
  }

  function updateQuantity(index: number, quantity: number) {
    if (quantity <= 0) {
      removeItem(index);
      return;
    }
    items.value[index].quantity = quantity;
    persist();
  }

  function clearCart() {
    items.value = [];
    customerInfo.value = null;
    tableId.value = null;
    persist();
  }

  function setCustomerInfo(payload: CustomerInfo) {
    customerInfo.value = payload;
  }

  function setTableId(id: string | null) {
    tableId.value = id;
  }

  return {
    items,
    customerInfo,
    tableId,
    totalItems,
    subtotal,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    setCustomerInfo,
    setTableId,
  };
});
