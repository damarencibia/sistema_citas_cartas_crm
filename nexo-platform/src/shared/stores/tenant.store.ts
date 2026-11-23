import { defineStore } from 'pinia';
import { supabase } from '@/shared/api/supabase.client';
import { applyTenantTheme } from '@/app/plugins/vuetify';
import type { Database } from '@/shared/types/supabase.gen';

type Tenant = Omit<Database['public']['Tables']['tenants']['Row'], 'modules' | 'config'> & {
  modules: { appointments: boolean; crm: boolean; events: boolean };
  config: Record<string, unknown>;
};

interface TenantStoreState {
  tenant: Tenant | null;
  isLoading: boolean;
}

/**
 * Defaults de la paleta anterior al brand refresh de nov-2026.
 * Los tenants que nunca personalizaron su marca deben heredar el tema nuevo;
 * los colores personalizados se respetan. Puede eliminarse cuando la migración
 * 20261112120000_brand_palette_refresh.sql esté aplicada en todos los entornos.
 */
const LEGACY_BRAND_COLORS = new Set(['#1976D2', '#424242', '#3ECF8E', '#6B7280']);

function customBrandColor(color: string | null | undefined): string | undefined {
  if (!color) return undefined;
  return LEGACY_BRAND_COLORS.has(color.toUpperCase()) ? undefined : color;
}

export const useTenantStore = defineStore('tenant', {
  state: (): TenantStoreState => ({
    tenant: null,
    isLoading: false,
  }),

  getters: {
    activeModules: (state) => {
      const t: any = state.tenant;
      return {
        appointments: !!t?.modules?.appointments,
        crm: !!t?.modules?.crm,
        events: !!t?.modules?.events,
      };
    },
    businessType: (state) => {
      const m: any = state.tenant?.modules;
      const appointments = !!m?.appointments;
      const events = !!m?.events;
      if (appointments && events) return 'both';
      if (events) return 'events';
      if (appointments) return 'appointments';
      return 'none';
    },
    primaryColor: (state) => state.tenant?.primary_color ?? '#FC4C13',
    secondaryColor: (state) => state.tenant?.secondary_color ?? '#808080',
  },

  actions: {
    async fetchTenant(tenantId: string) {
      this.isLoading = true;
      const { data } = await supabase.from('tenants').select('*').eq('id', tenantId).single();
      if (data) {
        this.tenant = data as unknown as Tenant;
        applyTenantTheme({
          primary: customBrandColor(data.primary_color),
          secondary: customBrandColor(data.secondary_color),
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
          primary: customBrandColor(data.primary_color),
          secondary: customBrandColor(data.secondary_color),
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
