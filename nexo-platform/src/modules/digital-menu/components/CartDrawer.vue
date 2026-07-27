<template>
  <v-sheet elevation="3" class="pa-4" rounded>
    <div class="d-flex align-center justify-space-between mb-4">
      <div>
        <div class="text-h6 font-weight-bold">Tu pedido</div>
        <div class="text-caption text-medium-emphasis">{{ items.length }} artículos</div>
      </div>
      <div class="text-h6 font-weight-bold">{{ formatPrice(total) }}</div>
    </div>

    <div v-if="items.length === 0" class="text-center py-12 text-medium-emphasis">
      El carrito está vacío.
    </div>

    <div v-else>
      <CartItem
        v-for="(item, index) in items"
        :key="index"
        :item="item"
        @remove="() => removeItem(index)"
        @update-quantity="(qty: number) => updateQuantity(index, qty)"
      />
    </div>

    <v-divider class="my-4" />

    <v-form ref="formRef" class="mb-4">
      <v-text-field
        v-model="customer.name"
        class="mb-3"
        label="Nombre"
        required
      />
      <v-text-field
        v-model="customer.email"
        label="Email"
        type="email"
        class="mb-3"
      />
      <v-text-field v-model="customer.phone" label="Teléfono" class="mb-3" />
      <v-select
        v-model="selectedTableId"
        :items="tables"
        item-title="number"
        item-value="id"
        label="Mesa"
        clearable
      />
    </v-form>

    <div class="d-flex justify-space-between align-center mb-3">
      <div class="text-subtitle-2 text-medium-emphasis">Subtotal</div>
      <div class="text-subtitle-1 font-weight-medium">{{ formatPrice(total) }}</div>
    </div>

    <v-btn
      color="primary"
      block
      :disabled="items.length === 0 || !customer.name"
      @click="onSubmit"
    >
      Enviar pedido
    </v-btn>
  </v-sheet>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import type { CartItem } from '../types/cart.types';
import type { Table } from '../types/table.types';

const props = defineProps<{
  items: CartItem[];
  total: number;
  tables: Table[];
  customerInfo?: { name: string; email?: string; phone?: string } | null;
  selectedTableId?: string | null;
}>();

const emit = defineEmits<{
  (e: 'removeItem', index: number): void;
  (e: 'updateQuantity', index: number, quantity: number): void;
  (e: 'submit'): void;
  (e: 'update:customerInfo', info: { name: string; email?: string; phone?: string }): void;
  (e: 'update:selectedTableId', id: string | null): void;
}>();

// local reactive state with safe defaults
const customer = ref({ name: '', email: '', phone: '', ...(props.customerInfo ?? {}) });
const selectedTableId = ref<string | null>(props.selectedTableId ?? null);
const formRef = ref<HTMLFormElement | null>(null);

// sync if parent replaces the prop object
watch(
  () => props.customerInfo,
  (v) => {
    if (v) customer.value = { name: v.name ?? '', email: v.email ?? '', phone: v.phone ?? '' };
  },
);

watch(
  () => props.selectedTableId,
  (v) => {
    selectedTableId.value = v ?? null;
  },
);

watch(customer, (value) => emit('update:customerInfo', value), { deep: true });
watch(selectedTableId, (value) => emit('update:selectedTableId', value));

function formatPrice(value: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value);
}

function removeItem(index: number) {
  if (index < 0 || index >= props.items.length) return;
  emit('removeItem', index);
}

function updateQuantity(index: number, quantity: number) {
  const qty = Math.max(1, Math.floor(Number(quantity) || 1));
  if (index < 0 || index >= props.items.length) return;
  emit('updateQuantity', index, qty);
}

function onSubmit() {
  // basic validation: name required and at least one item
  if (!customer.value?.name || props.items.length === 0) return;
  emit('submit');
}
</script>
