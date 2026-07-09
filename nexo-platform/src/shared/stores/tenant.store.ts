import { defineStore } from 'pinia';
import { supabase } from '@/shared/api/supabase.client';
import { applyTenantTheme } from '@/app/plugins/vuetify';
import type { Tenant } from '@/shared/types';

interface TenantStoreState {
  tenant: Tenant | null;
  isLoading: boolean;
}

export const useTenantStore = defineStore('tenant', {
  state: (): TenantStoreState => ({
    tenant: null,
    isLoading: false,
  }),

  getters: {
    activeModules: (state) =>
      state.tenant?.modules ?? { appointments: false, digital_menu: false, crm: false },
    primaryColor: (state) => state.tenant?.primary_color ?? '#1976D2',
    secondaryColor: (state) => state.tenant?.secondary_color ?? '#424242',
  },

  actions: {
    async fetchTenant(tenantId: string) {
      this.isLoading = true;
      const { data } = await supabase.from('tenants').select('*').eq('id', tenantId).single();
      if (data) {
        const tenant = data as unknown as Tenant;
        this.tenant = tenant;
        applyTenantTheme({
          primary: tenant.primary_color,
          secondary: tenant.secondary_color,
        });
      }
      this.isLoading = false;
    },

    async fetchTenantBySlug(slug: string) {
      this.isLoading = true;
      const { data } = await supabase.from('tenants').select('*').eq('slug', slug).single();
      if (data) {
        const tenant = data as unknown as Tenant;
        this.tenant = tenant;
        applyTenantTheme({
          primary: tenant.primary_color,
          secondary: tenant.secondary_color,
        });
      }
      this.isLoading = false;
      return this.tenant;
    },

    async updateTenant(payload: Partial<Tenant>) {
      if (!this.tenant) return;
      const { error } = await supabase
        .from('tenants')
        .update(payload as Record<string, unknown>)
        .eq('id', this.tenant.id);
      if (error) throw error;
      if (payload.primary_color || payload.secondary_color) {
        applyTenantTheme({
          primary: payload.primary_color,
          secondary: payload.secondary_color,
        });
      }
    },
  },
});
