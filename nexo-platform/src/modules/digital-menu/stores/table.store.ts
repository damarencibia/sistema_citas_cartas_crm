import { defineStore } from 'pinia';
import { tableRepository } from '../repositories/table.repository';
import type { Table, CreateTableDTO, UpdateTableDTO } from '../types/table.types';
import { useAuthStore } from '@/shared/stores/auth.store';

interface TableStoreState {
  tables: Table[];
  loading: boolean;
}

export const useTableStore = defineStore('digital-menu/tables', {
  state: (): TableStoreState => ({
    tables: [],
    loading: false,
  }),

  actions: {
    async fetchTables() {
      const authStore = useAuthStore();
      const tenantId = authStore.user?.tenant_id;
      if (!tenantId) return;
      this.loading = true;
      try {
        this.tables = await tableRepository.getByTenant(tenantId);
      } finally {
        this.loading = false;
      }
    },

    async createTable(payload: CreateTableDTO) {
      const created = await tableRepository.create(payload);
      this.tables.push(created);
      return created;
    },

    async updateTable(payload: UpdateTableDTO) {
      const updated = await tableRepository.update(payload);
      const index = this.tables.findIndex((table) => table.id === updated.id);
      if (index !== -1) this.tables[index] = updated;
      return updated;
    },

    async deleteTable(id: string) {
      await tableRepository.delete(id);
      this.tables = this.tables.filter((table) => table.id !== id);
    },
  },
});
