<template>
  <v-card class="mb-3" outlined>
    <v-card-text>
      <div class="d-flex justify-space-between align-center mb-2">
        <div>
          <div class="font-weight-medium">{{ item.productName }}</div>
          <div class="text-caption text-medium-emphasis">{{ item.variantName || 'Sin variante' }}</div>
        </div>
        <div>{{ formatPrice((item.unitPrice + item.extrasPrice) * item.quantity) }}</div>
      </div>
      <div class="d-flex align-center justify-space-between">
        <v-text-field
          type="number"
          min="1"
          class="ma-0"
          style="width: 100px"
          v-model.number="quantity"
          @change="onQuantityChange"
        />
        <v-btn text color="error" @click="$emit('remove')">Eliminar</v-btn>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import type { CartItem } from '../types/cart.types';

const props = defineProps<{ item: CartItem }>();
const emit = defineEmits<{
  (e: 'remove'): void;
  (e: 'updateQuantity', quantity: number): void;
}>();

const quantity = ref<number>(props.item.quantity ?? 1);

watch(quantity, (value) => {
  emit('updateQuantity', value ?? 1);
});

function onQuantityChange() {
  if (quantity.value < 1) quantity.value = 1;
}

function formatPrice(value: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value);
}
</script>
