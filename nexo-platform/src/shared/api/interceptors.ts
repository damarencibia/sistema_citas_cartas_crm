import type { AxiosInstance } from 'axios';
import { supabase } from './supabase.client';

export function setupInterceptors(client: AxiosInstance) {
  client.interceptors.request.use(async (config) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (error.response?.status === 401) {
        await supabase.auth.signOut();
        window.location.href = '/auth/login';
      }
      return Promise.reject(error);
    },
  );
}
