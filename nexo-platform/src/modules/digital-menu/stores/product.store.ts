import { defineStore } from 'pinia';
import { productRepository } from '../repositories/product.repository';
import type { Product, CreateProductDTO, UpdateProductDTO } from '../types/product.types';
import { useAuthStore } from '@/shared/stores/auth.store';

interface ProductStoreState {
  products: Product[];
  loading: boolean;
  selectedProduct: Product | null;
}

export const useProductStore = defineStore('digital-menu/products', {
  state: (): ProductStoreState => ({
    products: [],
    loading: false,
    selectedProduct: null,
  }),

  actions: {
    async fetchProducts() {
      const authStore = useAuthStore();
      const tenantId = authStore.user?.tenant_id;
      if (!tenantId) return;
      this.loading = true;
      try {
        this.products = await productRepository.getByTenant(tenantId);
      } finally {
        this.loading = false;
      }
    },

    async fetchProductById(id: string) {
      this.loading = true;
      try {
        this.selectedProduct = await productRepository.getWithRelations(id);
      } finally {
        this.loading = false;
      }
    },

    async createProduct(payload: CreateProductDTO) {
      const created = await productRepository.create(payload);
      this.products.push(created);
      return created;
    },

    async updateProduct(payload: UpdateProductDTO) {
      const updated = await productRepository.update(payload);
      const index = this.products.findIndex((product) => product.id === updated.id);
      if (index !== -1) this.products[index] = updated;
      return updated;
    },

    async deleteProduct(id: string) {
      await productRepository.delete(id);
      this.products = this.products.filter((product) => product.id !== id);
    },
  },
});
