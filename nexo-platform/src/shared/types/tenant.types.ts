export interface Tenant {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone?: string;
  address?: string;
  logo_url?: string;
  primary_color: string;
  secondary_color: string;
  plan_id: string;
  status: 'trial' | 'active' | 'suspended' | 'cancelled';
  modules: {
    appointments: boolean;
    digital_menu: boolean;
    crm: boolean;
  };
  timezone: string;
  locale: string;
  config: Record<string, any>;
  created_at: string;
}

export interface TenantState {
  tenant: Tenant | null;
  isLoading: boolean;
}
