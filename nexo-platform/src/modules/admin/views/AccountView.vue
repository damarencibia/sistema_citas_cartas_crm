<template>
  <div>
    <PageHeader title="Mi Cuenta" subtitle="Tu perfil y tu contraseña de acceso" />

    <v-row>
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title class="text-subtitle-1">Perfil</v-card-title>
          <v-card-text>
            <div class="d-flex align-center ga-3 mb-4">
              <v-avatar color="primary" size="48">
                <span class="text-white font-weight-bold">{{ initials }}</span>
              </v-avatar>
              <div>
                <div class="text-body-1 font-weight-medium">{{ authStore.userName }}</div>
                <div class="text-caption text-medium-emphasis">{{ authStore.user?.email }}</div>
              </div>
            </div>
            <v-chip size="small" label :color="roleColor">
              {{ roleLabel }}
            </v-chip>
            <div class="mt-4 text-caption text-medium-emphasis">
              El nombre, el email y el rol son gestionados por el administrador
              de tu negocio desde la pantalla de Empleados.
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card>
          <v-card-title class="text-subtitle-1">Cambiar contraseña</v-card-title>
          <v-card-text>
            <v-alert
              v-if="isInitialPassword"
              type="info"
              variant="tonal"
              density="compact"
              class="mb-4"
            >
              Estás usando una contraseña asignada por el administrador.
              Al cambiarla dejará de ser visible para él, por seguridad.
            </v-alert>

            <v-form ref="formRef" @submit.prevent="onChangePassword">
              <v-text-field
                v-model="form.current"
                label="Contraseña actual"
                type="password"
                prepend-inner-icon="mdi-lock-outline"
                :rules="[required]"
                :error-messages="currentError ? [currentError] : []"
                autocomplete="current-password"
              />
              <v-text-field
                v-model="form.next"
                label="Nueva contraseña"
                :type="generated ? 'text' : 'password'"
                prepend-inner-icon="mdi-lock-reset"
                :rules="[required, minLength]"
                autocomplete="new-password"
                hint="Mínimo 8 caracteres"
                persistent-hint
                @update:model-value="onNextInput"
              >
                <template #append-inner>
                  <v-icon
                    icon="mdi-dice-5"
                    size="20"
                    title="Generar contraseña automática"
                    @click="generateNext"
                  />
                </template>
              </v-text-field>
              <v-text-field
                v-model="form.confirm"
                label="Confirmar nueva contraseña"
                :type="generated ? 'text' : 'password'"
                prepend-inner-icon="mdi-lock-check"
                :rules="[required, matchesPassword]"
                autocomplete="new-password"
                :readonly="generated !== null"
                :hint="generated ? 'Ya confirmada automáticamente al generar' : ''"
                persistent-hint
              />
              <v-btn
                type="submit"
                color="primary"
                variant="flat"
                class="mt-2"
                :loading="saving"
                block
              >
                Guardar nueva contraseña
              </v-btn>
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { supabase } from '@/shared/api/supabase.client';
import { useAuthStore } from '@/shared/stores/auth.store';
import { useNotification } from '@/shared/composables/useNotification';
import PageHeader from '@/shared/components/PageHeader.vue';
import { generatePassword } from '@/shared/utils/password';

const authStore = useAuthStore();
const notification = useNotification();

const formRef = ref();
const saving = ref(false);
const currentError = ref<string | null>(null);

const form = reactive({ current: '', next: '', confirm: '' });

// Modo autogenerado: rellena nueva + confirmación; la confirmación
// queda bloqueada hasta que el usuario edite la contraseña a mano.
const generated = ref<string | null>(null);

function generateNext() {
  const value = generatePassword();
  form.next = value;
  form.confirm = value;
  generated.value = value;
}

// Si el usuario escribe su propia contraseña, salimos del modo generado
// (la cadena aleatoria se pierde; el usuario reinicia su confirmación).
function onNextInput(v: string) {
  if (generated.value && v !== generated.value) {
    generated.value = null;
    form.confirm = '';
  }
}

const initials = computed(() => {
  const user = authStore.user;
  if (!user) return 'N';
  return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
});

const isInitialPassword = computed(() => !!authStore.user?.initial_password_pending);

const roleColor = computed(() => {
  const map: Record<string, string> = {
    owner: 'primary',
    admin: 'info',
    employee: 'grey',
    super_admin: 'deep-purple',
  };
  return map[authStore.user?.role ?? ''] ?? 'grey';
});

const roleLabel = computed(() => {
  const map: Record<string, string> = {
    owner: 'Propietario',
    admin: 'Administrador',
    employee: 'Empleado',
    super_admin: 'Super Admin',
  };
  return map[authStore.user?.role ?? ''] ?? authStore.user?.role ?? '';
});

function required(v: string) {
  return !!v || 'Campo requerido';
}

function minLength(v: string) {
  return v.length >= 8 || 'Mínimo 8 caracteres';
}

function matchesPassword(v: string) {
  return v === form.next || 'Las contraseñas no coinciden';
}

async function onChangePassword() {
  const { valid } = await formRef.value.validate();
  if (!valid) return;

  saving.value = true;
  currentError.value = null;

  try {
    // Verifica la contraseña actual antes de permitir el cambio:
    // si falla, el usuario sigue con la misma contraseña y le avisamos.
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: authStore.user!.email,
      password: form.current,
    });
    if (verifyError) {
      currentError.value = 'La contraseña actual no es correcta';
      return;
    }

    // Al cambiarla, el trigger de BD apaga users.initial_password_pending
    // (la credencial compartida deja de ser vigente para el admin).
    const { error: updateError } = await supabase.auth.updateUser({
      password: form.next,
    });
    if (updateError) {
      notification.error(updateError.message || 'Error al cambiar la contraseña');
      return;
    }

    // Releer el perfil ya persistido (flag actualizado)
    if (authStore.user?.supabase_user_id) {
      await authStore.fetchProfile(authStore.user.supabase_user_id);
    }

    notification.success('Contraseña actualizada. Ya solo tú la conoces.');
    generated.value = null;
    form.current = '';
    form.next = '';
    form.confirm = '';
    formRef.value.resetValidation();
  } finally {
    saving.value = false;
  }
}
</script>
