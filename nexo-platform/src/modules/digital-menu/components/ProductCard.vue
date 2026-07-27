<template>
  <v-card class="mb-4" elevation="1" @click="selectProduct">
    <v-img
      v-if="product.images?.length"
      :src="product.images[0]"
      height="180"
      cover
    />
    <v-card-text>
      <div class="d-flex justify-space-between align-center mb-2">
        <div>
          <div class="text-subtitle-1 font-weight-medium">{{ product.name || 'Producto' }}</div>
          <div class="text-caption text-medium-emphasis">{{ product.description || 'Sin descripción' }}</div>
        </div>
        <div class="text-subtitle-2 font-weight-bold">{{ formatPrice(product.price ?? 0) }}</div>
      </div>
      <div class="d-flex align-center justify-space-between">
        <v-chip small color="success" v-if="product.is_available">Disponible</v-chip>
        <v-chip small color="grey" v-else>Agotado</v-chip>
        <v-chip small color="primary" v-if="product.is_featured">Destacado</v-chip>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import type { Product } from '../types/product.types';

const props = defineProps<{ product: Product }>();
const emit = defineEmits<{
  (e: 'select', product: Product): void;
}>();

function selectProduct() {
  emit('select', props.product);
}

function formatPrice(value: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value);
}
</script>
