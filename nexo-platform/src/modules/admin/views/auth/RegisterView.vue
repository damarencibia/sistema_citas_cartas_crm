<template>
  <RegisterScene
    :loading="loading"
    :auth-error="authError"
    :has-active-session="!!authStore.session"
    @submit="handleRegister"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/shared/stores/auth.store';
import RegisterScene from './RegisterScene.vue';

const router = useRouter();
const authStore = useAuthStore();
const loading = ref(false);
const authError = ref<string | null>(null);

// Prefijo de Cuba, fijo y no editable (el.scene envía el número local de 8 dígitos)
const PHONE_PREFIX = '+53';

interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  businessName: string;
  phone: string;
}

async function handleRegister(payload: RegisterPayload) {
  loading.value = true;
  authError.value = null;
  try {
    // El registro debe partir de un estado limpio: si hay sesión de otra
    // cuenta, el signUp viaja con ese JWT y GoTrue falla (y de todos modos
    // la sesión nueva no reemplazaría la vista). Cerramos antes.
    if (authStore.session) {
      await authStore.logout();
    }
    await authStore.register(
      payload.email,
      payload.password,
      payload.firstName,
      payload.lastName,
      payload.businessName,
      `${PHONE_PREFIX}${payload.phone}`,
    );
    // Con el autoconfirm activo, signUp devuelve sesión y podemos
    // avanzar directo al dashboard. Si Supabase devolviera un estado
    // sin sesión (confirmación requerida), ir al login.
    if (authStore.session) {
      router.push('/');
    } else {
      router.push('/auth/login');
    }
  } catch (e: unknown) {
    const err = (e ?? null) as { status?: number; message?: string } | null;
    const msg = err?.message ?? '';
    if (err?.status === 422 || /already registered|ya está registrad/i.test(msg)) {
      authError.value = 'Este email ya tiene una cuenta. Inicia sesión con ese email en su lugar.';
    } else if (/unexpected_failure|Database error/i.test(msg)) {
      authError.value =
        'No pudimos crear la cuenta en este momento. Espera unos segundos e inténtalo de nuevo.';
    } else {
      authError.value = msg || 'Error al registrarse';
    }
  } finally {
    loading.value = false;
  }
}
</script>
