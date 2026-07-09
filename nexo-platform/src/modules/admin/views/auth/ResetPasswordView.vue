<template>
  <div>
    <h2 class="text-h5 font-weight-bold text-center mb-1">Restablecer Contraseña</h2>
    <p class="text-body-2 text-medium-emphasis text-center mb-6">Ingresa tu nueva contraseña</p>

    <v-alert
      v-if="error"
      type="error"
      variant="tonal"
      class="mb-4"
    >
      {{ error }}
    </v-alert>

    <v-form @submit.prevent="handleSubmit">
      <v-text-field
        v-model="password"
        label="Nueva contraseña"
        prepend-inner-icon="mdi-lock"
        type="password"
        :rules="[required, minLength]"
      />
      <v-text-field
        v-model="confirmPassword"
        label="Confirmar contraseña"
        prepend-inner-icon="mdi-lock"
        type="password"
        :rules="[required, matchPassword]"
      />

      <v-btn
        type="submit"
        color="primary"
        size="large"
        block
        :loading="loading"
        class="mt-2"
      >
        Restablecer
      </v-btn>
    </v-form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { supabase } from '@/shared/api/supabase.client';

const router = useRouter();
const password = ref('');
const confirmPassword = ref('');
const loading = ref(false);
const error = ref<string | null>(null);

function required(v: string) {
  return !!v || 'Campo requerido';
}
function minLength(v: string) {
  return v.length >= 8 || 'Mínimo 8 caracteres';
}

const matchPassword = computed(() => {
  return (v: string) => v === password.value || 'Las contraseñas no coinciden';
});

async function handleSubmit() {
  loading.value = true;
  error.value = null;
  try {
    await supabase.auth.updateUser({ password: password.value });
    router.push('/auth/login');
  } catch (e: any) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}
</script>
