import { defineStore } from 'pinia';
import { supabase } from '@/shared/api/supabase.client';
import { applyTenantTheme } from '@/app/plugins/vuetify';
import type { Database } from '@/shared/types/supabase.gen';

type Tenant = Omit<Database['public']['Tables']['tenants']['Row'], 'modules' | 'config'> & {
  modules: { appointments: boolean; digital_menu: boolean; crm: boolean };
  config: Record<string, unknown>;
};

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
    activeModules: (state) => {
      const t: any = state.tenant;
      return { appointments: !!t?.modules?.appointments, digital_menu: !!t?.modules?.digital_menu, crm: !!t?.modules?.crm };
    },
    primaryColor: (state) => state.tenant?.primary_color ?? '#1976D2',
    secondaryColor: (state) => state.tenant?.secondary_color ?? '#424242',
  },

  actions: {
    async fetchTenant(tenantId: string) {
      this.isLoading = true;
      const { data } = await supabase.from('tenants').select('*').eq('id', tenantId).single();
      if (data) {
        this.tenant = data as unknown as Tenant;
        applyTenantTheme({
          primary: data.primary_color ?? undefined,
          secondary: data.secondary_color ?? undefined,
        });
      }
      this.isLoading = false;
    },

    async fetchTenantBySlug(slug: string) {
      this.isLoading = true;
      const { data } = await supabase.from('tenants').select('*').eq('slug', slug).single();
      if (data) {
        this.tenant = data as unknown as Tenant;
        applyTenantTheme({
          primary: data.primary_color ?? undefined,
          secondary: data.secondary_color ?? undefined,
        });
      }
      this.isLoading = false;
      return this.tenant;
    },

    async updateTenant(payload: Partial<Tenant>) {
      if (!this.tenant) return;
      const { data, error } = await supabase
        .from('tenants')
        .update(payload as any)
        .eq('id', this.tenant.id)
        .select('id')
        .single();
      if (error) throw error;
      if (!data) throw new Error('No se pudo guardar los cambios');
      this.tenant = { ...this.tenant, ...payload } as Tenant;
      if (payload.primary_color || payload.secondary_color) {
        applyTenantTheme({
          primary: payload.primary_color ?? undefined,
          secondary: payload.secondary_color ?? undefined,
        });
      }
    },
  },
});
