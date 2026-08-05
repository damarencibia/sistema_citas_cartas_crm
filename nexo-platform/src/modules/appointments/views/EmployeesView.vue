<template>
  <div>
    <PageHeader title="Empleados" subtitle="Gestiona los miembros de tu negocio">
      <template #actions>
        <v-btn color="primary" @click="openCreateDialog">
          <v-icon start>mdi-account-plus</v-icon>
          Nuevo Empleado
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
        :items="employeeStore.employees"
        :total="employeeStore.employees.length"
        :loading="employeeStore.loading"
        item-value="id"
        show-expand
        :headers="headers"
      >
        <template #[`item.full_name`]="{ item }">
          <div class="d-flex align-center ga-2">
            <v-avatar :color="item.color || 'grey'" size="32">
              <span class="text-white text-caption">
                {{ (item.first_name || '')[0] }}{{ (item.last_name || '')[0] }}
              </span>
            </v-avatar>
            <div>
              <div class="text-body-2 font-weight-medium">{{ item.first_name }} {{ item.last_name }}</div>
              <div class="text-caption text-medium-emphasis">{{ item.email || 'Sin email' }}</div>
            </div>
          </div>
        </template>
        <template #[`item.role`]="{ value }">
          <v-chip :color="roleColor(value)" size="small" label>
            {{ roleLabel(value) }}
          </v-chip>
        </template>
        <template #[`item.services`]="{ item }">
          <v-chip-group>
            <v-chip
              v-for="s in employeeServices(item.id)"
              :key="s.id"
              size="x-small"
              variant="tonal"
              :color="s.color || 'primary'"
            >
              {{ s.name }}
            </v-chip>
          </v-chip-group>
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
        <template #[`item.actions`]="{ item }">
          <v-btn
            icon="mdi-pencil"
            size="small"
            variant="text"
            @click="openEditDialog(item)"
          />
          <v-btn
            icon="mdi-delete"
            size="small"
            variant="text"
            color="error"
            :disabled="item.role === 'owner'"
            @click="onDelete(item)"
          />
        </template>
        <template #expanded-row="{ item }">
          <div class="pa-4">
            <div class="text-subtitle-2 mb-2">Servicios que realiza</div>
            <div v-if="employeeServices(item.id).length === 0" class="text-body-2 text-medium-emphasis">
              Sin servicios asignados
            </div>
            <v-chip-group v-else>
              <v-chip
                v-for="s in employeeServices(item.id)"
                :key="s.id"
                variant="outlined"
                :color="s.color || 'primary'"
                class="mb-1"
              >
                {{ s.name }}
              </v-chip>
            </v-chip-group>
          </div>
        </template>
      </DataTable>
    </v-card>

    <!-- Create Dialog -->
    <v-dialog
      v-model="createDialog"
      max-width="560"
      persistent
      :fullscreen="$vuetify.display.smAndDown"
    >
      <v-card>
        <v-card-title class="text-h6 d-flex align-center">
          Agregar Empleado
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
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="form.first_name"
                  label="Nombre *"
                  :rules="rules.required"
                  density="comfortable"
                />
              </v-col>
              <v-col cols="12" sm="6">
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
            Crear Empleado
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Edit Dialog -->
    <EmployeeForm
      :visible="showEditDialog"
      :employee="editingEmployee"
      :service-options="serviceOptions"
      @close="closeEditDialog"
      @save="onEditSave"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useServiceStore } from '@/modules/appointments/stores/service.store';
import { useAuthStore } from '@/shared/stores/auth.store';
import { useEmployeeStore } from '../stores/employee.store';
import { useNotification } from '@/shared/composables/useNotification';
import { useConfirm } from '@/shared/composables/useConfirm';
import PageHeader from '@/shared/components/PageHeader.vue';
import DataTable from '@/shared/components/DataTable.vue';
import EmployeeForm from '../components/EmployeeForm.vue';
import type { Employee } from '../types/employee.types';
import type { EmployeeFormData } from '../components/EmployeeForm.vue';
import { employeeRepository } from '../repositories/employee.repository';

const employeeStore = useEmployeeStore();
const serviceStore = useServiceStore();
const authStore = useAuthStore();
const notification = useNotification();
const { confirm } = useConfirm();

const headers = [
  { title: 'Miembro', key: 'full_name', sortable: false },
  { title: 'Rol', key: 'role', sortable: true },
  { title: 'Servicios', key: 'services', sortable: false },
  { title: 'Activo', key: 'is_active', sortable: true },
  { title: 'Acciones', key: 'actions', sortable: false },
];

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

const showEditDialog = ref(false);
const editingEmployee = ref<Employee | null>(null);

const roleOptions = [
  { label: 'Empleado', value: 'employee' },
  { label: 'Administrador', value: 'admin' },
];

const rules = {
  required: [(v: string) => !!v?.trim() || 'Campo requerido'],
  email: (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'Email inválido',
  minLength: (min: number) => (v: string) => (v?.length ?? 0) >= min || `Mínimo ${min} caracteres`,
};

const serviceOptions = computed(() =>
  serviceStore.services.map((s: any) => ({
    value: s.id,
    text: s.name,
  })),
);

function employeeServices(employeeId: string) {
  return serviceStore.services.filter((s) => s.employee_id === employeeId);
}

function roleColor(role: string): string {
  const map: Record<string, string> = { owner: 'primary', admin: 'info', employee: 'grey' };
  return map[role] ?? 'grey';
}

function roleLabel(role: string): string {
  const map: Record<string, string> = { owner: 'Propietario', admin: 'Admin', employee: 'Empleado' };
  return map[role] ?? role;
}

onMounted(async () => {
  await Promise.all([
    employeeStore.fetchEmployeesWithRoles(),
    serviceStore.fetchServices(),
  ]);
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
      formError.value = result.error || 'Error al crear el empleado';
      return;
    }

    closeCreateDialog();
    alertMessage.value = `${form.first_name} ${form.last_name} fue agregado exitosamente. Puede iniciar sesión con ${form.email}.`;
    alertType.value = 'success';
    await Promise.all([
      employeeStore.fetchEmployeesWithRoles(),
      serviceStore.fetchServices(),
    ]);
  } catch (e: unknown) {
    formError.value = e instanceof Error ? e.message : 'Error de conexión. Intente de nuevo.';
  } finally {
    creating.value = false;
  }
}

function openEditDialog(employee: Employee) {
  editingEmployee.value = employee;
  showEditDialog.value = true;
}

function closeEditDialog() {
  showEditDialog.value = false;
  editingEmployee.value = null;
}

async function onEditSave(data: EmployeeFormData) {
  if (!editingEmployee.value) return;
  try {
    await employeeStore.updateEmployee(editingEmployee.value.id, {
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email || undefined,
      phone: data.phone || undefined,
      color: data.color,
      is_active: data.is_active,
    });
    await employeeRepository.updateServices(editingEmployee.value.id, data.service_ids);
    await serviceStore.fetchServices();
    notification.success('Empleado actualizado');
    closeEditDialog();
  } catch {
    notification.error('Error al guardar empleado');
  }
}

async function toggleActive(member: Employee, value: boolean) {
  if (member.role === 'owner') return;
  try {
    await employeeStore.updateEmployee(member.id, { is_active: value });
  } catch {
    /* ignore */
  }
}

async function onDelete(member: Employee) {
  if (member.role === 'owner') return;
  const ok = await confirm(`¿Eliminar a "${member.first_name} ${member.last_name}"?`);
  if (!ok) return;
  try {
    await employeeStore.deleteEmployee(member.id);
    notification.success('Empleado eliminado');
  } catch {
    notification.error('Error al eliminar empleado');
  }
}
</script>
