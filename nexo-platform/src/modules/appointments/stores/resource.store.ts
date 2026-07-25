import { defineStore } from 'pinia';
import { resourceRepository } from '../repositories/resource.repository';
import { useAuthStore } from '@/shared/stores/auth.store';
import type { Resource, CreateResourceDTO } from '../types/resource.types';

interface ResourceStoreState {
  resources: Resource[];
  loading: boolean;
}

export const useResourceStore = defineStore('appointments/resources', {
  state: (): ResourceStoreState => ({
    resources: [],
    loading: false,
  }),

  getters: {
    activeResources: (state) => state.resources.filter((r) => r.is_active),
    rooms: (state) => state.resources.filter((r) => r.type === 'room' && r.is_active),
    equipment: (state) => state.resources.filter((r) => r.type === 'equipment' && r.is_active),
  },

  actions: {
    async fetchResources() {
      this.loading = true;
      try {
        const authStore = useAuthStore();
        const tenantId = authStore.user?.tenant_id;
        if (!tenantId) return;
        this.resources = await resourceRepository.getAll(tenantId);
      } finally {
        this.loading = false;
      }
    },

    async createResource(dto: CreateResourceDTO): Promise<Resource> {
      const authStore = useAuthStore();
      const tenantId = authStore.user?.tenant_id;
      if (!tenantId) throw new Error('No tenant ID available');
      const resource = await resourceRepository.create(tenantId, dto);
      this.resources.push(resource);
      return resource;
    },

    async updateResource(id: string, dto: Partial<CreateResourceDTO & { is_active: boolean }>): Promise<Resource> {
      const updated = await resourceRepository.update(id, dto);
      const index = this.resources.findIndex((r) => r.id === id);
      if (index !== -1) this.resources[index] = updated;
      return updated;
    },

    async removeResource(id: string): Promise<void> {
      await resourceRepository.remove(id);
      this.resources = this.resources.filter((r) => r.id !== id);
    },
  },
});
