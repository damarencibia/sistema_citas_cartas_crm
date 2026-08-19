import { defineStore } from 'pinia';
import { serviceCategoryRepository } from '../repositories/service-category.repository';
import { useAuthStore } from '@/shared/stores/auth.store';
import type { ServiceCategory, CreateServiceCategoryDTO, UpdateServiceCategoryDTO } from '../types/service-category.types';

interface ServiceCategoryStoreState {
  categories: ServiceCategory[];
  loading: boolean;
}

export const useServiceCategoryStore = defineStore('appointments/service-categories', {
  state: (): ServiceCategoryStoreState => ({
    categories: [],
    loading: false,
  }),

  getters: {
    activeCategories: (state) => state.categories.filter((c) => c.is_active),
  },

  actions: {
    async fetchCategories(tenantId?: string) {
      const id = tenantId ?? useAuthStore().user?.tenant_id;
      if (!id) return;
      this.loading = true;
      try {
        this.categories = await serviceCategoryRepository.getAll(id);
      } finally {
        this.loading = false;
      }
    },

    async createCategory(dto: CreateServiceCategoryDTO): Promise<ServiceCategory> {
      const authStore = useAuthStore();
      const tenantId = authStore.user?.tenant_id;
      if (!tenantId) throw new Error('No tenant ID available');
      const category = await serviceCategoryRepository.create(dto, tenantId);
      this.categories.push(category);
      return category;
    },

    async updateCategory(id: string, dto: UpdateServiceCategoryDTO): Promise<ServiceCategory> {
      const updated = await serviceCategoryRepository.update(id, dto);
      const index = this.categories.findIndex((c) => c.id === id);
      if (index !== -1) this.categories[index] = updated;
      return updated;
    },

    async deleteCategory(id: string): Promise<void> {
      await serviceCategoryRepository.softDelete(id);
      this.categories = this.categories.filter((c) => c.id !== id);
    },
  },
});
