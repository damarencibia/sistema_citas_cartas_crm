export interface NoShowPolicy {
  grace_period_minutes: number;
  max_no_shows: number;
  block_duration_days: number;
}

export interface AppointmentConfig {
  auto_start: boolean;
  no_show_policy: NoShowPolicy;
  cancellation_policy_hours: number;
  require_reason_cancel: boolean;
  allow_reschedule: boolean;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone?: string;
  address?: string;
  description?: string;
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
  config: {
    appointments?: AppointmentConfig;
    [key: string]: unknown;
  };
  created_at: string;
}

export interface TenantState {
  tenant: Tenant | null;
  isLoading: boolean;
}
