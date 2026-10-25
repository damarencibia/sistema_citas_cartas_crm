import { defineStore } from 'pinia';
import { supabase } from '@/shared/api/supabase.client';
import type { Database } from '@/shared/types/supabase.gen';

type User = Database['public']['Tables']['users']['Row'];

interface AuthStoreState {
  user: User | null;
  session: any | null;
  isLoading: boolean;
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthStoreState => ({
    user: null,
    session: null,
    isLoading: true,
  }),

  getters: {
    isAuthenticated: (state) => !!state.session,
    userRole: (state) => state.user?.role,
    userName: (state) => (state.user ? `${state.user.first_name} ${state.user.last_name}` : ''),
    isAdmin: (state) => {
      const role = state.user?.role;
      return role === 'super_admin' || role === 'owner' || role === 'admin';
    },
  },

  actions: {
    async initialize() {
      this.isLoading = true;
      const {
        data: { session },
      } = await supabase.auth.getSession();
      this.session = session;
      if (session?.user) {
        await this.fetchProfile(session.user.id);
      }
      this.isLoading = false;

      supabase.auth.onAuthStateChange(async (_event, session) => {
        this.session = session;
        if (session?.user) {
          await this.fetchProfile(session.user.id);
        } else {
          this.user = null;
        }
      });
    },

    async fetchProfile(supabaseUserId: string) {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('supabase_user_id', supabaseUserId)
        .single();
      if (data) this.user = data;
    },

    async login(email: string, password: string) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // Cargar el perfil inmediatamente: la navegación por rol puede
      // leer authStore.user antes de que onAuthStateChange dispare.
      this.session = data.session;
      if (data.user) {
        await this.fetchProfile(data.user.id);
      }
      return data;
    },

    async register(
      email: string,
      password: string,
      firstName: string,
      lastName: string,
      businessName: string,
      phone: string,
    ) {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { first_name: firstName, last_name: lastName, business_name: businessName, phone },
        },
      });
      if (authError) throw authError;
      // Con autoconfirm, signUp devuelve sesión: fijarla ya para que
      // la UI (y la redirección) dependan del estado real, no del
      // listener en onAuthStateChange que puede llegar desfasado.
      if (authData.session) {
        this.session = authData.session;
        if (authData.session.user) {
          await this.fetchProfile(authData.session.user.id);
        }
      }
      return authData;
    },

    async logout() {
      await supabase.auth.signOut();
      this.user = null;
      this.session = null;
    },

    async sendPasswordReset(email: string) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (error) throw error;
    },
  },
});
