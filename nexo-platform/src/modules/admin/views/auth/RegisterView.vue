<template>
  <div>
    <h2 class="text-h5 font-weight-bold text-center mb-1">Crear tu Cuenta</h2>
    <p class="text-body-2 text-medium-emphasis text-center mb-6">
      Registra tu negocio en Nexo Platform
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

    <v-form @submit.prevent="handleRegister">
      <v-text-field
        v-model="form.businessName"
        label="Nombre del negocio"
        prepend-inner-icon="mdi-store"
        :rules="[required]"
      />
      <v-text-field
        v-model="form.firstName"
        label="Nombre"
        prepend-inner-icon="mdi-account"
        :rules="[required]"
      />
      <v-text-field
        v-model="form.lastName"
        label="Apellido"
        prepend-inner-icon="mdi-account"
        :rules="[required]"
      />
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
        :rules="[required, minLength]"
        autocomplete="new-password"
      />

      <v-btn
        type="submit"
        color="primary"
        size="large"
        block
        :loading="loading"
        class="mt-2"
      >
        Crear Cuenta
      </v-btn>
    </v-form>

    <p class="text-center text-body-2 mt-4">
      ¿Ya tienes cuenta?
      <router-link
        to="/auth/login"
        class="text-primary font-weight-medium"
      >
        Iniciar Sesión
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
  businessName: '',
  firstName: '',
  lastName: '',
  email: '',
  password: '',
});

function required(value: string) {
  return !!value || 'Campo requerido';
}
function minLength(value: string) {
  return value.length >= 8 || 'Mínimo 8 caracteres';
}

async function handleRegister() {
  loading.value = true;
  authError.value = null;
  try {
    await authStore.register(
      form.email,
      form.password,
      form.firstName,
      form.lastName,
      form.businessName,
    );
    router.push('/auth/login');
  } catch (e: any) {
    authError.value = e.message || 'Error al registrarse';
  } finally {
    loading.value = false;
  }
}
</script>
