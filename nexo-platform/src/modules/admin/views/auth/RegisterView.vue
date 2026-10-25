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
    <v-alert
      v-if="successMessage"
      type="success"
      variant="tonal"
      class="mb-4"
    >
      {{ successMessage }}
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
        :rules="[required, validEmail]"
        autocomplete="email"
      />
      <v-text-field
        v-model="form.phone"
        label="Número de teléfono"
        hint="Solo el número. El prefijo de Cuba (+53) está fijo."
        persistent-hint
        maxlength="8"
        :rules="[required, validPhone]"
        autocomplete="tel-national"
      >
        <template #prepend-inner>
          <v-icon icon="mdi-phone" size="20" class="mr-1 opacity-60" />
          <span class="phone-prefix">+53</span>
          <v-divider vertical class="ml-2 mr-3" />
        </template>
      </v-text-field>
      <v-text-field
        v-model="form.password"
        label="Contraseña"
        prepend-inner-icon="mdi-lock"
        type="password"
        :rules="[required, minLength]"
        autocomplete="new-password"
      />
      <v-text-field
        v-model="form.confirmPassword"
        label="Confirmar contraseña"
        prepend-inner-icon="mdi-lock-check"
        type="password"
        :rules="[required, matchesPassword]"
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
const successMessage = ref<string | null>(null);

// Prefijo de Cuba, fijo y no editable
const PHONE_PREFIX = '+53';

const form = reactive({
  businessName: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
});

function required(value: string) {
  return !!value || 'Campo requerido';
}
function minLength(value: string) {
  return value.length >= 8 || 'Mínimo 8 caracteres';
}
function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || 'Correo electrónico no válido';
}
function validPhone(value: string) {
  return /^\d{8}$/.test(value) || 'Debe ser un número de 8 dígitos';
}
function matchesPassword(value: string) {
  return value === form.password || 'Las contraseñas no coinciden';
}

async function handleRegister() {
  if (form.password !== form.confirmPassword) return;
  loading.value = true;
  authError.value = null;
  successMessage.value = null;
  try {
    await authStore.register(
      form.email,
      form.password,
      form.firstName,
      form.lastName,
      form.businessName,
      `${PHONE_PREFIX}${form.phone}`,
    );
    // Con el autoconfirm activo, signUp devuelve sesión y podemos
    // avanzar directo al dashboard. Si Supabase devolviera un estado
    // sin sesión (confirmación requerida), ir al login con aviso.
    if (authStore.session) {
      router.push('/');
    } else {
      successMessage.value = 'Cuenta creada. Inicia sesión para continuar.';
      router.push('/auth/login');
    }
  } catch (e: any) {
    authError.value = e.message || 'Error al registrarse';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.phone-prefix {
  color: rgba(0, 0, 0, 0.6);
  font-weight: 500;
  line-height: 1.2;
}
</style>

