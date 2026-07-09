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
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },

    async register(
      email: string,
      password: string,
      firstName: string,
      lastName: string,
      businessName: string,
    ) {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { first_name: firstName, last_name: lastName, business_name: businessName },
        },
      });
      if (authError) throw authError;
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
