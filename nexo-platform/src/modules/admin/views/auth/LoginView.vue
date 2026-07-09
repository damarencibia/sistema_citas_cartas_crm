<template>
  <div>
    <h2 class="text-h5 font-weight-bold text-center mb-1">Iniciar Sesión</h2>
    <p class="text-body-2 text-medium-emphasis text-center mb-6">
      Ingresa tus credenciales para acceder
    </p>

    <v-alert
      v-if="authError"
      type="error"
      variant="tonal"
      class="mb-4"
      closable
    >
      {{ authError }}
    </v-alert>

    <v-form @submit.prevent="handleLogin">
      <v-text-field
        v-model="form.email"
        label="Correo electrónico"
        prepend-inner-icon="mdi-email"
        type="email"
        :rules="[required]"
        autocomplete="email"
      />

      <v-text-field
        v-model="form.password"
        label="Contraseña"
        prepend-inner-icon="mdi-lock"
        type="password"
        :rules="[required]"
        autocomplete="current-password"
      />

      <div class="text-right mb-4">
        <router-link to="/auth/forgot-password" class="text-body-2 text-primary">
          ¿Olvidaste tu contraseña?
        </router-link>
      </div>

      <v-btn
        type="submit"
        color="primary"
        size="large"
        block
        :loading="loading"
      >
        Iniciar Sesión
      </v-btn>
    </v-form>

    <p class="text-center text-body-2 mt-4">
      ¿No tienes cuenta?
      <router-link
        to="/auth/register"
        class="text-primary font-weight-medium"
      >
        Registrarse
      </router-link>
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/shared/stores/auth.store';

const router = useRouter();
const authStore = useAuthStore();
const loading = ref(false);
const authError = ref<string | null>(null);

const form = reactive({
  email: '',
  password: '',
});

function required(value: string) {
  return !!value || 'Campo requerido';
}

async function handleLogin() {
  loading.value = true;
  authError.value = null;
  try {
    await authStore.login(form.email, form.password);
    router.push('/');
  } catch (e: any) {
    authError.value = e.message || 'Error al iniciar sesión';
  } finally {
    loading.value = false;
  }
}
</script>
