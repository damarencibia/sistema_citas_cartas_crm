<template>
  <div class="public-layout">
    <v-container class="py-8" max-width="1200">
      <div class="text-center mb-6">
        <h1 class="text-h4 font-weight-bold">{{ tenantStore.tenant?.name || 'Carta Digital' }}</h1>
        <p class="text-body-1 text-medium-emphasis">Explora nuestro menú</p>
      </div>

      <v-row>
        <v-col cols="12" md="8">
          <v-sheet class="pa-4 mb-6" elevation="1">
            <v-chip
              v-for="category in categories"
              :key="category.id"
              class="ma-1"
              :color="activeCategory === category.id ? 'primary' : 'grey lighten-2'"
              text-color="white"
              @click="selectCategory(category.id)"
            >
              {{ category.name }}
            </v-chip>
          </v-sheet>

          <div v-if="loading" class="text-center pa-8">
            <v-progress-circular indeterminate color="primary" />
          </div>

          <div v-else>
            <ProductCard
              v-for="product in filteredProducts"
              :key="product.id"
              :product="product"
              @select="openProductDetail"
            />
          </div>
        </v-col>

        <v-col cols="12" md="4">
          <v-sheet elevation="3" class="pa-4" rounded>
            <div class="text-h6 font-weight-bold mb-4">Tu pedido</div>
            <div class="text-center py-12 text-medium-emphasis">
              <v-icon size="48" color="grey lighten-1" class="mb-4">mdi-silverware-variant</v-icon>
              <p>Para realizar un pedido, consulta con nuestro personal.</p>
            </div>
          </v-sheet>
        </v-col>
      </v-row>

      <v-dialog v-model="productDialog" width="700">
        <ProductDetail
          v-if="selectedProduct"
          :product="selectedProduct"
          :readonly="true"
        />
      </v-dialog>
    </v-container>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import ProductCard from '../components/ProductCard.vue';
import ProductDetail from '../components/ProductDetail.vue';
import { useTenantStore } from '@/shared/stores/tenant.store';
import { categoryRepository } from '../repositories/category.repository';
import { productRepository } from '../repositories/product.repository';
import type { Category } from '../types/category.types';
import type { FullProduct } from '../types/product.types';

const route = useRoute();
const tenantStore = useTenantStore();

const categories = ref<Category[]>([]);
const products = ref<FullProduct[]>([]);
const loading = ref(true);
const productDialog = ref(false);
const selectedProduct = ref<FullProduct | null>(null);

const activeCategory = ref<string | null>(null);

const filteredProducts = computed(() => {
  if (!activeCategory.value) return products.value;
  return products.value.filter((product) => product.category_id === activeCategory.value);
});

function selectCategory(categoryId: string) {
  activeCategory.value = categoryId;
}

async function loadPublicContent() {
  loading.value = true;
  try {
    const slug = route.params.slug as string;
    const tenant = await tenantStore.fetchTenantBySlug(slug);
    if (!tenant) return;

    categories.value = await categoryRepository.getByTenant(tenant.id);
    products.value = await productRepository.getByTenant(tenant.id);
    activeCategory.value = categories.value[0]?.id ?? null;
  } finally {
    loading.value = false;
  }
}

async function openProductDetail(product: FullProduct) {
  selectedProduct.value = await productRepository.getWithRelations(product.id);
  productDialog.value = true;
}

onMounted(loadPublicContent);
</script>
