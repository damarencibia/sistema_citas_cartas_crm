import { defineStore } from 'pinia';
import { categoryRepository } from '../repositories/category.repository';
import type { Category, CreateCategoryDTO, UpdateCategoryDTO } from '../types/category.types';
import { useAuthStore } from '@/shared/stores/auth.store';

interface CategoryStoreState {
  categories: Category[];
  loading: boolean;
}

export const useCategoryStore = defineStore('digital-menu/categories', {
  state: (): CategoryStoreState => ({
    categories: [],
    loading: false,
  }),

  actions: {
    async fetchCategories() {
      const authStore = useAuthStore();
      const tenantId = authStore.user?.tenant_id;
      if (!tenantId) return;
      this.loading = true;
      try {
        this.categories = await categoryRepository.getByTenant(tenantId);
      } finally {
        this.loading = false;
      }
    },

    async createCategory(payload: CreateCategoryDTO) {
      const created = await categoryRepository.create(payload);
      this.categories.push(created);
      return created;
    },

    async updateCategory(payload: UpdateCategoryDTO) {
      const updated = await categoryRepository.update(payload);
      const index = this.categories.findIndex((category) => category.id === updated.id);
      if (index !== -1) this.categories[index] = updated;
      return updated;
    },

    async deleteCategory(id: string) {
      await categoryRepository.delete(id);
      this.categories = this.categories.filter((category) => category.id !== id);
    },
  },
});
