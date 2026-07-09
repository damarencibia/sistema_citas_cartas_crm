<template>
  <div>
    <h2 class="text-h5 font-weight-bold text-center mb-1">Recuperar Contraseña</h2>
    <p class="text-body-2 text-medium-emphasis text-center mb-6">
      Te enviaremos un link para restablecer tu contraseña
    </p>

    <v-alert
      v-if="sent"
      type="success"
      variant="tonal"
      class="mb-4"
    >
      Si el correo existe, recibirás un link de recuperación.
    </v-alert>

    <v-form @submit.prevent="handleSubmit">
      <v-text-field
        v-model="email"
        label="Correo electrónico"
        prepend-inner-icon="mdi-email"
        type="email"
        :rules="[required]"
      />

      <v-btn
        type="submit"
        color="primary"
        size="large"
        block
        :loading="loading"
        class="mt-2"
      >
        Enviar Link
      </v-btn>
    </v-form>

    <p class="text-center text-body-2 mt-4">
      <router-link
        to="/auth/login"
        class="text-primary font-weight-medium"
      >
        Volver al inicio
      </router-link>
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '@/shared/stores/auth.store';

const authStore = useAuthStore();
const email = ref('');
const loading = ref(false);
const sent = ref(false);

function required(value: string) {
  return !!value || 'Campo requerido';
}

async function handleSubmit() {
  loading.value = true;
  try {
    await authStore.sendPasswordReset(email.value);
    sent.value = true;
  } finally {
    loading.value = false;
  }
}
</script>
