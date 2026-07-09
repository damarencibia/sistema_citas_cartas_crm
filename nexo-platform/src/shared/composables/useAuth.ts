import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/shared/stores/auth.store';
import type { LoginPayload, RegisterPayload } from '@/shared/types';

export function useAuth() {
  const router = useRouter();
  const authStore = useAuthStore();
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function login(payload: LoginPayload) {
    loading.value = true;
    error.value = null;
    try {
      await authStore.login(payload.email, payload.password);
      router.push('/');
    } catch (e: any) {
      error.value = e.message || 'Error al iniciar sesión';
    } finally {
      loading.value = false;
    }
  }

  async function register(payload: RegisterPayload) {
    loading.value = true;
    error.value = null;
    try {
      await authStore.register(
        payload.email,
        payload.password,
        payload.firstName,
        payload.lastName,
        payload.businessName,
      );
      router.push('/auth/login');
    } catch (e: any) {
      error.value = e.message || 'Error al registrarse';
    } finally {
      loading.value = false;
    }
  }

  async function logout() {
    await authStore.logout();
    router.push('/auth/login');
  }

  return { login, register, logout, loading, error };
}
