<template>
  <div>
    <PageHeader title="Equipo" subtitle="Gestiona los miembros de tu negocio">
      <template #actions>
        <v-btn color="primary" @click="openCreateDialog">
          <v-icon start>mdi-account-plus</v-icon>
          Agregar Miembro
        </v-btn>
      </template>
    </PageHeader>

    <v-alert
      v-if="alertMessage"
      :type="alertType"
      variant="tonal"
      class="mb-4"
      closable
      @click:close="alertMessage = null"
    >
      {{ alertMessage }}
    </v-alert>

    <v-card>
      <DataTable
        :items="teamMembers"
        :total="teamMembers.length"
        :loading="loading"
        :headers="headers"
      >
        <template #[`item.full_name`]="{ item }">
          <div class="d-flex align-center ga-2">
            <v-avatar :color="item.role === 'owner' ? 'primary' : 'grey'" size="32">
              <span class="text-white text-caption">
                {{ (item.first_name || '')[0] }}{{ (item.last_name || '')[0] }}
              </span>
            </v-avatar>
            <div>
              <div class="text-body-2 font-weight-medium">{{ item.first_name }} {{ item.last_name }}</div>
              <div class="text-caption text-medium-emphasis">{{ item.email }}</div>
            </div>
          </div>
        </template>
        <template #[`item.role`]="{ value }">
          <v-chip
            :color="roleColor(value)"
            size="small"
            label
          >
            {{ roleLabel(value) }}
          </v-chip>
        </template>
        <template #[`item.is_active`]="{ value, item }">
          <v-switch
            :model-value="value"
            density="compact"
            hide-details
            :disabled="item.role === 'owner'"
            @update:model-value="toggleActive(item, $event)"
          />
        </template>
      </DataTable>
    </v-card>

    <v-dialog v-model="createDialog" max-width="560" persistent>
      <v-card>
        <v-card-title class="text-h6 d-flex align-center">
          Agregar Miembro del Equipo
          <v-spacer />
          <v-btn
            icon="mdi-close"
            size="small"
            variant="text"
            @click="closeCreateDialog"
          />
        </v-card-title>
        <v-card-text>
          <v-alert
            v-if="formError"
            type="error"
            variant="tonal"
            class="mb-4"
            closable
            @click:close="formError = null"
          >
            {{ formError }}
          </v-alert>
          <v-form ref="formRef">
            <v-row>
              <v-col cols="6">
                <v-text-field
                  v-model="form.first_name"
                  label="Nombre *"
                  :rules="rules.required"
                  density="comfortable"
                />
              </v-col>
              <v-col cols="6">
                <v-text-field
                  v-model="form.last_name"
                  label="Apellidos *"
                  :rules="rules.required"
                  density="comfortable"
                />
              </v-col>
            </v-row>
            <v-text-field
              v-model="form.email"
              label="Correo electrónico *"
              type="email"
              :rules="[...rules.required, rules.email]"
              density="comfortable"
              class="mb-1"
            />
            <v-text-field
              v-model="form.password"
              label="Contraseña *"
              type="password"
              :rules="[...rules.required, rules.minLength(6)]"
              density="comfortable"
              class="mb-1"
              hint="Mínimo 6 caracteres"
              persistent-hint
            />
            <v-select
              v-model="form.role"
              :items="roleOptions"
              item-title="label"
              item-value="value"
              label="Rol"
              density="comfortable"
              class="mb-1"
            />
            <v-text-field
              v-model="form.phone"
              label="Teléfono (opcional)"
              density="comfortable"
              class="mb-1"
            />
            <v-text-field
              v-model="form.color"
              label="Color en agenda"
              type="color"
              density="comfortable"
              class="mb-1"
            />
            <v-select
              v-model="form.service_ids"
              :items="serviceOptions"
              item-title="text"
              item-value="value"
              label="Servicios que realiza"
              multiple
              chips
              closable-chips
              density="comfortable"
            />
          </v-form>
        </v-card-text>
        <v-card-actions class="pa-4 pt-0">
          <v-spacer />
          <v-btn variant="text" @click="closeCreateDialog">Cancelar</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :loading="creating"
            @click="onCreate"
          >
            Crear Miembro
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useServiceStore } from '@/modules/appointments/stores/service.store';
import { useAuthStore } from '@/shared/stores/auth.store';
import { useEmployeeStore } from '@/modules/appointments/stores/employee.store';
import PageHeader from '@/shared/components/PageHeader.vue';
import DataTable from '@/shared/components/DataTable.vue';

const serviceStore = useServiceStore();
const authStore = useAuthStore();
const employeeStore = useEmployeeStore();

const headers = [
  { title: 'Miembro', key: 'full_name' },
  { title: 'Rol', key: 'role' },
  { title: 'Activo', key: 'is_active' },
];

const teamMembers = ref<any[]>([]);
const loading = ref(true);
const createDialog = ref(false);
const creating = ref(false);
const formRef = ref();
const formError = ref<string | null>(null);
const alertMessage = ref<string | null>(null);
const alertType = ref<'success' | 'error'>('success');

const form = reactive({
  first_name: '',
  last_name: '',
  email: '',
  password: '',
  role: 'employee' as 'admin' | 'employee',
  phone: '',
  color: '#1976D2',
  service_ids: [] as string[],
});

const roleOptions = [
  { label: 'Empleado', value: 'employee' },
  { label: 'Administrador', value: 'admin' },
];

const rules = {
  required: [(v: string) => !!v?.trim() || 'Campo requerido'],
  email: (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'Email inválido',
  minLength: (min: number) => (v: string) => (v?.length ?? 0) >= min || `Mínimo ${min} caracteres`,
};

const serviceOptions = (() => {
  try {
    return serviceStore.activeServices.map((s: any) => ({
      value: s.id,
      text: s.name,
    }));
  } catch {
    return [];
  }
})();

function roleColor(role: string): string {
  const map: Record<string, string> = { owner: 'primary', admin: 'info', employee: 'grey' };
  return map[role] ?? 'grey';
}

function roleLabel(role: string): string {
  const map: Record<string, string> = { owner: 'Propietario', admin: 'Admin', employee: 'Empleado' };
  return map[role] ?? role;
}

onMounted(async () => {
  await Promise.all([employeeStore.fetchEmployeesWithRoles(), serviceStore.fetchServices()]);
  teamMembers.value = employeeStore.employees;
  loading.value = false;
});

function openCreateDialog() {
  form.first_name = '';
  form.last_name = '';
  form.email = '';
  form.password = '';
  form.role = 'employee';
  form.phone = '';
  form.color = '#1976D2';
  form.service_ids = [];
  formError.value = null;
  createDialog.value = true;
}

function closeCreateDialog() {
  createDialog.value = false;
  formError.value = null;
}

async function onCreate() {
  const { valid } = await formRef.value.validate();
  if (!valid) return;

  creating.value = true;
  formError.value = null;

  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const functionsBase = `${supabaseUrl}/functions/v1`;

    const res = await fetch(`${functionsBase}/create-team-member`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.session?.access_token ?? ''}`,
      },
      body: JSON.stringify({
        email: form.email.trim(),
        password: form.password,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        role: form.role,
        phone: form.phone.trim() || undefined,
        color: form.color,
        service_ids: form.service_ids.length > 0 ? form.service_ids : undefined,
      }),
    });

    const result = await res.json();

    if (!res.ok || !result.success) {
      formError.value = result.error || 'Error al crear el miembro del equipo';
      return;
    }

    closeCreateDialog();
    alertMessage.value = `${form.first_name} ${form.last_name} fue agregado exitosamente. Ahora puede iniciar sesión con ${form.email}.`;
    alertType.value = 'success';
    await employeeStore.fetchEmployeesWithRoles();
    teamMembers.value = employeeStore.employees;
  } catch (e: unknown) {
    formError.value = e instanceof Error ? e.message : 'Error de conexión. Intenta de nuevo.';
  } finally {
    creating.value = false;
  }
}

async function toggleActive(member: any, value: boolean) {
  if (member.role === 'owner') return;
  try {
    await employeeStore.updateEmployee(member.id, { is_active: value });
    member.is_active = value;
  } catch {
    /* ignore */
  }
}
</script>
