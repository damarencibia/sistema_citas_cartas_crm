<template>
  <div>
    <PageHeader title="Productos" subtitle="Administra los productos de tu carta">
      <template #actions>
        <v-btn color="primary" @click="openDialog = true">
          <v-icon start>mdi-plus</v-icon>
          Nuevo producto
        </v-btn>
      </template>
    </PageHeader>

    <v-card>
      <DataTable :items="products" :total="products.length" :loading="loading" :headers="headers">
        <template #item.is_available="{ item }">
          <v-chip :color="item.is_available ? 'success' : 'grey'" small>
            {{ item.is_available ? 'Disponible' : 'Agotado' }}
          </v-chip>
        </template>
      </DataTable>
    </v-card>

    <v-dialog v-model="openDialog" width="560">
      <v-card>
        <v-card-title>Nuevo producto</v-card-title>
        <v-card-text>
          <v-form ref="formRef" lazy-validation>
            <v-text-field v-model="form.name" label="Nombre" required class="mb-4" />
            <v-textarea v-model="form.description" label="Descripción" rows="3" class="mb-4" />
            <v-text-field v-model.number="form.price" label="Precio" type="number" class="mb-4" />
            <v-file-input
              label="Imagen del producto"
              accept="image/*"
              v-model="imageFile"
              prepend-icon="mdi-image"
              class="mb-4"
            />
            <div v-if="form.images?.length" class="mb-3">
              <v-img :src="form.images[0]" max-width="160" contain />
            </div>
            <v-select
              v-model="form.category_id"
              :items="categories"
              item-title="name"
              item-value="id"
              label="Categoría"
              required
              class="mb-4"
            />
            <v-switch v-model="form.is_available" label="Disponible" class="mb-4" />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="closeDialog">Cancelar</v-btn>
          <v-btn color="primary" @click="saveProduct">Guardar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import PageHeader from '@/shared/components/PageHeader.vue';
import DataTable from '@/shared/components/DataTable.vue';
import { useProductStore } from '../stores/product.store';
import { useCategoryStore } from '../stores/category.store';
import { useAuthStore } from '@/shared/stores/auth.store';
import { productRepository } from '../repositories/product.repository';
import type { Category } from '../types/category.types';

const productStore = useProductStore();
const categoryStore = useCategoryStore();
const openDialog = ref(false);
const formRef = ref();

const form = reactive({
  name: '',
  description: '',
  price: 0,
  category_id: '',
  is_available: true,
  has_variants: false,
  has_extras: false,
  is_featured: false,
  images: [] as string[],
  sort_order: 0,
});

const imageFile = ref<File | null>(null);

const headers = [
  { title: 'Nombre', key: 'name' },
  { title: 'Categoría', key: 'category_id' },
  { title: 'Precio', key: 'price' },
  { title: 'Disponible', key: 'is_available' },
];

const products = productStore.products;
const categories = categoryStore.categories;
const loading = productStore.loading;

onMounted(async () => {
  await Promise.all([categoryStore.fetchCategories(), productStore.fetchProducts()]);
});

function closeDialog() {
  openDialog.value = false;
}

const authStore = useAuthStore();

async function saveProduct() {
  if (!form.name.trim() || !form.category_id) return;
  const tenantId = authStore.user?.tenant_id;
  if (!tenantId) return;

  // upload image if provided
  if (imageFile.value) {
    try {
      const url = await productRepository.uploadImage(tenantId, imageFile.value);
      form.images = [url];
    } catch (err) {
      console.error('Error subiendo imagen', err);
    }
  }

  await productStore.createProduct({
    name: form.name,
    description: form.description || null,
    price: form.price,
    category_id: form.category_id,
    tenant_id: tenantId,
    is_available: form.is_available,
    has_variants: form.has_variants,
    has_extras: form.has_extras,
    is_featured: form.is_featured,
    images: form.images.length ? form.images : null,
    sort_order: form.sort_order,
  });
  closeDialog();
}
</script>
