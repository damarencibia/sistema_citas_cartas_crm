import { defineStore } from 'pinia';
import { customerRepository } from '../repositories/customer.repository';
import { useAuthStore } from '@/shared/stores/auth.store';
import type {
  Customer,
  CreateCustomerDTO,
  Tag,
  UpdateCustomerDTO,
} from '../types/customer.types';

interface CustomerStoreState {
  customers: Customer[];
  tags: Tag[];
  loading: boolean;
}

export const useCustomerStore = defineStore('crm/customers', {
  state: (): CustomerStoreState => ({
    customers: [],
    tags: [],
    loading: false,
  }),

  getters: {
    customerById: (state) => (id: string) => state.customers.find((c) => c.id === id) ?? null,
    systemTags: (state) => state.tags.filter((t) => t.is_system),
    customTags: (state) => state.tags.filter((t) => !t.is_system),
  },

  actions: {
    async fetchCustomers() {
      const tenantId = useAuthStore().user?.tenant_id;
      if (!tenantId) return;
      this.loading = true;
      try {
        this.customers = await customerRepository.getAll(tenantId);
      } finally {
        this.loading = false;
      }
    },

    async fetchTags() {
      const tenantId = useAuthStore().user?.tenant_id;
      if (!tenantId) return;
      try {
        this.tags = await customerRepository.getTags(tenantId);
      } finally {
        // el llamador decide cómo reaccionar a errores de etiquetas
      }
    },

    /**
     * Crea el cliente y lo agrega al listado en memoria (sin refetch completo).
     */
    async createCustomer(dto: CreateCustomerDTO): Promise<Customer> {
      const tenantId = useAuthStore().user?.tenant_id;
      if (!tenantId) throw new Error('Sesión sin negocio asociado');
      const customer = await customerRepository.create(dto, tenantId);
      this.customers.unshift(customer);
      return customer;
    },

    /**
     * Actualiza en el repositorio y reemplaza la fila en el listado.
     */
    async updateCustomer(id: string, dto: UpdateCustomerDTO): Promise<Customer> {
      const updated = await customerRepository.update(id, dto);
      const index = this.customers.findIndex((c) => c.id === id);
      if (index !== -1) this.customers[index] = updated;
      return updated;
    },

    /**
     * Eliminado lógico con remoción local inmediata (sin refetch).
     */
    async deleteCustomer(id: string): Promise<void> {
      await customerRepository.softDelete(id);
      this.customers = this.customers.filter((c) => c.id !== id);
    },

    /**
     * Almacena las etiquetas de un cliente y devuelve el listado final.
     */
    async setCustomerTags(customerId: string, tagIds: string[]): Promise<string[]> {
      const tenantId = useAuthStore().user?.tenant_id;
      if (!tenantId) throw new Error('Sesión sin negocio asociado');
      await customerRepository.setCustomerTags(customerId, tenantId, tagIds);
      return tagIds;
    },

    async createTag(name: string, color: string | null): Promise<Tag> {
      const tenantId = useAuthStore().user?.tenant_id;
      if (!tenantId) throw new Error('Sesión sin negocio asociado');
      const tag = await customerRepository.createTag(tenantId, name, color);
      this.tags.push(tag);
      return tag;
    },

    async updateTag(id: string, name: string, color: string | null): Promise<Tag> {
      const tag = await customerRepository.updateTag(id, name, color);
      const index = this.tags.findIndex((t) => t.id === id);
      if (index !== -1) this.tags[index] = tag;
      return tag;
    },

    async deleteTag(id: string): Promise<void> {
      await customerRepository.deleteTag(id);
      this.tags = this.tags.filter((t) => t.id !== id);
    },
  },
});
