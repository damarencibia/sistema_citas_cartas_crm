export interface User {
  id: string;
  tenant_id: string | null;
  supabase_user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  avatar_url?: string;
  role: 'super_admin' | 'owner' | 'admin' | 'employee';
  is_active: boolean;
  last_login_at?: string;
  created_at: string;
}

export interface AuthState {
  user: User | null;
  session: any | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  businessName: string;
}
