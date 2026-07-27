<template>
  <v-card>
    <v-card-title class="d-flex justify-space-between align-center">
      <div>
        <div class="text-h6 font-weight-bold">{{ product.name }}</div>
        <div class="text-caption text-medium-emphasis">{{ product.description }}</div>
        <div class="text-h6 font-weight-bold">{{ formatPrice(product.price) }}</div>
      </div>
    </v-card-title>

    <v-card-text>
      <v-divider class="my-4" />
      <div v-if="product.variants?.length" class="mb-4">
        <div class="text-subtitle-2 font-weight-medium mb-2">Tamaño</div>
        <template v-if="readonly">
          <div v-for="variant in product.variants" :key="variant.id" class="text-body-2 ml-2 mb-1">
            {{ variant.name }} — {{ formatPrice(variant.price ?? product.price) }}
          </div>
        </template>
        <v-radio-group v-else v-model="selectedVariantId">
          <v-radio
            v-for="variant in product.variants"
            :key="variant.id"
            :label="`${variant.name} ${formatPrice(variant.price ?? product.price)}`"
            :value="variant.id"
          />
        </v-radio-group>
      </div>

      <div v-for="group in product.extras ?? []" :key="group.id" class="mb-4">
        <div class="text-subtitle-2 font-weight-medium mb-2">{{ group.name }}</div>
        <template v-if="readonly">
          <div v-for="item in group.items" :key="item.id" class="text-body-2 ml-2 mb-1">
            {{ item.name }} + {{ formatPrice(item.price) }}
          </div>
        </template>
        <v-checkbox
          v-for="item in group.items"
          v-else
          :key="item.id"
          v-model="selectedExtrasIds"
          :label="`${item.name} + ${formatPrice(item.price)}`"
          :value="item.id"
        />
      </div>

      <template v-if="!readonly">
        <v-textarea
          v-model="notes"
          label="Notas"
          rows="2"
          class="mb-4"
        />

        <div class="d-flex align-center justify-space-between mb-4">
          <div class="d-flex align-center ga-2">
            <v-btn icon @click="decreaseQuantity"><v-icon>mdi-minus</v-icon></v-btn>
            <span class="text-subtitle-1">{{ quantity }}</span>
            <v-btn icon @click="increaseQuantity"><v-icon>mdi-plus</v-icon></v-btn>
          </div>
          <div class="text-subtitle-1 font-weight-medium">Total: {{ formatPrice(totalPrice) }}</div>
        </div>
      </template>
    </v-card-text>

    <v-card-actions v-if="!readonly">
      <v-spacer />
      <v-btn color="primary" @click="onAddToCart">Agregar al carrito</v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { FullProduct } from '../types/product.types';

type AddToCartPayload = {
  productId: string;
  productName: string;
  variantName?: string | null;
  quantity: number;
  unitPrice: number;
  extras: { id: string; name: string; price: number }[];
  extrasPrice: number;
  notes?: string | null;
};

const props = defineProps<{ product: FullProduct; readonly?: boolean }>();
const emit = defineEmits<{ (e: 'addToCart', payload: AddToCartPayload): void }>();

const selectedVariantId = ref<string | null>(props.product.variants?.[0]?.id ?? null);
const selectedExtrasIds = ref<string[]>([]);
const quantity = ref<number>(1);
const notes = ref<string>('');

const selectedVariant = computed(() =>
  (props.product.variants ?? []).find((variant) => variant.id === selectedVariantId.value) ?? null,
);

const selectedExtras = computed(() => {
  const extras = (props.product.extras ?? []).flatMap((group) => group.items ?? []);
  return extras.filter((extra) => selectedExtrasIds.value.includes(extra.id));
});

const extrasPrice = computed(() => selectedExtras.value.reduce((sum, extra) => sum + extra.price, 0));
const basePrice = computed(() => selectedVariant.value?.price ?? props.product.price ?? 0);
const totalPrice = computed(() => (basePrice.value + extrasPrice.value) * quantity.value);

function formatPrice(value: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value);
}

function increaseQuantity() {
  quantity.value += 1;
}

function decreaseQuantity() {
  if (quantity.value > 1) quantity.value -= 1;
}

function onAddToCart() {
  const payload: AddToCartPayload = {
    productId: props.product.id,
    productName: props.product.name,
    variantName: selectedVariant.value?.name ?? null,
    quantity: Math.max(1, Math.floor(quantity.value)),
    unitPrice: basePrice.value,
    extras: selectedExtras.value.map((extra) => ({ id: extra.id, name: extra.name, price: extra.price })),
    extrasPrice: extrasPrice.value,
    notes: notes.value || null,
  };
  emit('addToCart', payload);
}

watch(
  () => props.product.variants,
  () => {
    selectedVariantId.value = props.product.variants?.[0]?.id ?? null;
  },
);
</script>
