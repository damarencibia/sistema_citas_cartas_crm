import { defineStore } from 'pinia';
import { serviceRepository } from '../repositories/service.repository';
import { useAuthStore } from '@/shared/stores/auth.store';
import type { Service, CreateServiceDTO, UpdateServiceDTO } from '../types/service.types';

interface ServiceStoreState {
  services: Service[];
  currentService: Service | null;
  loading: boolean;
}

export const useServiceStore = defineStore('appointments/services', {
  state: (): ServiceStoreState => ({
    services: [],
    currentService: null,
    loading: false,
  }),

  getters: {
    activeServices: (state) => state.services.filter((s) => s.is_active),
    servicesByEmployee:
      (state) =>
      (employeeId: string) =>
        state.services.filter((s) => s.employee_id === employeeId),
    servicesByCategory:
      (state) =>
      (categoryId: string) =>
        state.services.filter((s) => s.category_id === categoryId),
  },

  actions: {
    async fetchServices() {
      this.loading = true;
      try {
        this.services = await serviceRepository.getAll();
      } finally {
        this.loading = false;
      }
    },

    async fetchServicesByEmployee(employeeId: string) {
      this.loading = true;
      try {
        this.services = await serviceRepository.getByEmployee(employeeId);
      } finally {
        this.loading = false;
      }
    },

    async fetchService(id: string) {
      this.loading = true;
      try {
        this.currentService = await serviceRepository.getById(id);
      } finally {
        this.loading = false;
      }
    },

    async createService(dto: CreateServiceDTO): Promise<Service> {
      const authStore = useAuthStore();
      const tenantId = authStore.user?.tenant_id;
      if (!tenantId) throw new Error('No tenant ID available');
      const service = await serviceRepository.create(dto, tenantId);
      this.services.push(service);
      return service;
    },

    async updateService(id: string, dto: UpdateServiceDTO): Promise<Service> {
      const updated = await serviceRepository.update(id, dto);
      const index = this.services.findIndex((s) => s.id === id);
      if (index !== -1) this.services[index] = updated;
      if (this.currentService?.id === id) this.currentService = updated;
      return updated;
    },

    async deleteService(id: string): Promise<void> {
      await serviceRepository.softDelete(id);
      this.services = this.services.filter((s) => s.id !== id);
      if (this.currentService?.id === id) this.currentService = null;
    },
  },
});
