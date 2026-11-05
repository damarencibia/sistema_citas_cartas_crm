<template>
  <LoginScene :loading="loading" :auth-error="authError" @submit="handleLogin" />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/shared/stores/auth.store';
import LoginScene from './LoginScene.vue';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const loading = ref(false);
const authError = ref<string | null>(null);

async function handleLogin(payload: { email: string; password: string }) {
  loading.value = true;
  authError.value = null;
  try {
    await authStore.login(payload.email, payload.password);
    // 1) Respeta ?redirect= capturado por authGuard.
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : null;
    if (redirect && redirect.startsWith('/')) {
      router.push(redirect);
      return;
    }
    // 2) Destino por rol: super_admin al panel de plataforma,
    //    el resto al dashboard (la vista por defecto es la agenda).
    if (authStore.user?.role === 'super_admin') {
      router.push('/admin/tenants');
    } else {
      router.push('/appointments/agenda');
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Error al iniciar sesión';
    authError.value = message;
  } finally {
    loading.value = false;
  }
}
</script>
