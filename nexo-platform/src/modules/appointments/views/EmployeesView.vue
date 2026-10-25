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
          <div v-if="item.categories?.length" class="d-flex flex-column align-start ga-1">
            <v-chip-group>
              <v-chip
                v-for="c in item.categories"
                :key="c.id"
                size="x-small"
                variant="tonal"
                color="primary"
              >
                {{ c.icon || '' }} {{ c.name }}
              </v-chip>
            </v-chip-group>
            <span class="text-caption text-medium-emphasis">
              {{ item.enabled_service_ids?.length ?? 0 }} servicio(s) que ofrece
            </span>
          </div>
          <span v-else class="text-caption text-medium-emphasis">Sin categorías</span>
        </template>
        <template #[`item.credential`]="{ item }">
          <template v-if="item.supabase_user_id && item.role !== 'owner'">
            <v-chip
              v-if="item.initial_password_pending"
              color="amber"
              size="x-small"
              label
            >
              <v-icon start size="12">mdi-key-alert</v-icon>
              Clave pendiente de cambio
            </v-chip>
            <v-chip
              v-else
              color="success"
              size="x-small"
              label
              variant="tonal"
            >
              Cambiada por el usuario
            </v-chip>
          </template>
          <span v-else class="text-caption text-medium-emphasis">—</span>
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
            v-if="item.supabase_user_id && item.role !== 'owner'"
            icon="mdi-lock-reset"
            size="small"
            variant="text"
            title="Restablecer contraseña compartible"
            @click="openResetDialog(item)"
          />
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
            <div class="text-subtitle-2 mb-2">Servicios que ofrece</div>
            <div v-if="!(item.enabled_service_ids || []).length" class="text-body-2 text-medium-emphasis">
              Sin servicios habilitados (el empleado los elige en Mis Servicios)
            </div>
            <v-chip-group v-else>
              <v-chip
                v-for="s in enabledServices(item)"
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
              label="Contraseña inicial *"
              :type="showPassword ? 'text' : 'password'"
              :rules="[...rules.required, rules.minLength(8)]"
              density="comfortable"
              class="mb-1"
              hint="Autogenerada: puedes usarla, editarla o borrarla y escribir una manual. Se te mostrará al final para compartirla."
              persistent-hint
              autocomplete="new-password"
            >
              <template #append-inner>
                <v-icon
                  icon="mdi-dice-5"
                  size="20"
                  class="mr-2"
                  title="Generar otra contraseña aleatoria"
                  @click="form.password = generatePassword()"
                />
                <v-icon
                  :icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
                  size="20"
                  @click="showPassword = !showPassword"
                />
              </template>
            </v-text-field>
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
              maxlength="8"
              :rules="[phoneRule]"
              hint="Prefijo de Cuba (+53) fijo. Se usa para compartir credenciales por WhatsApp."
              persistent-hint
            >
              <template #prepend-inner>
                <span class="phone-prefix">+53</span>
                <v-divider vertical class="mr-2" />
              </template>
            </v-text-field>
            <v-text-field
              v-model="form.color"
              label="Color en agenda"
              type="color"
              density="comfortable"
              class="mb-1"
            />
            <v-select
              v-model="form.category_ids"
              :items="categoryOptions"
              item-title="text"
              item-value="value"
              label="Categorías que atiende"
              multiple
              chips
              closable-chips
              density="comfortable"
              hint="Se autohabilitan los servicios de esas categorías; el empleado los ajusta en Mis Servicios"
              persistent-hint
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

    <!-- Credentials Dialog (post-create / post-reset) -->
    <v-dialog
      v-model="credentialsDialog"
      max-width="480"
      persistent
    >
      <v-card>
        <v-card-title class="text-h6 d-flex align-center">
          <v-icon color="success" class="mr-2">mdi-check-circle</v-icon>
          Credenciales listas
        </v-card-title>
        <v-card-text>
          <v-alert
            type="warning"
            variant="tonal"
            class="mb-4"
            density="compact"
          >
            Esta contraseña <strong>no volverá a mostrarse</strong>. Compártela ahora con
            el empleado; cuando la cambie en "Mi Cuenta", quedará invalidada para el admin.
          </v-alert>
          <div class="credential-row">
            <div>
              <div class="text-caption text-medium-emphasis">Usuario</div>
              <div class="text-body-2 font-weight-medium">{{ credentials.email }}</div>
            </div>
            <v-btn
              icon="mdi-content-copy"
              size="small"
              variant="text"
              @click="copyToClipboard(credentials.email, 'Usuario')"
            />
          </div>
          <v-divider class="my-3" />
          <div class="credential-row">
            <div>
              <div class="text-caption text-medium-emphasis">Contraseña</div>
              <div class="text-body-1 font-weight-bold select-all">{{ credentials.password }}</div>
            </div>
            <v-btn
              icon="mdi-content-copy"
              size="small"
              variant="text"
              @click="copyToClipboard(credentials.password, 'Contraseña')"
            />
          </div>
          <v-btn
            v-if="whatsappHref"
            color="success"
            variant="tonal"
            block
            class="mt-4"
            :href="whatsappHref"
            target="_blank"
            rel="noopener"
          >
            <v-icon start>mdi-whatsapp</v-icon>
            Compartir por WhatsApp
          </v-btn>
        </v-card-text>
        <v-card-actions class="pa-4 pt-0">
          <v-spacer />
          <v-btn
            color="primary"
            variant="flat"
            data-done
            @click="credentialsDialog = false"
          >
            Entendido
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Reset Password Dialog -->
    <v-dialog
      v-model="resetDialog"
      max-width="480"
      persistent
      :fullscreen="$vuetify.display.smAndDown"
    >
      <v-card>
        <v-card-title class="text-h6 d-flex align-center">
          <v-icon color="warning" class="mr-2">mdi-lock-reset</v-icon>
          Restablecer contraseña
          <v-spacer />
          <v-btn
            icon="mdi-close"
            size="small"
            variant="text"
            @click="resetDialog = false"
          />
        </v-card-title>
        <v-card-text>
          <p class="text-body-2 mb-3">
            Se establecerá una <strong>nueva contraseña</strong> para
            <strong>{{ resetTarget?.first_name }} {{ resetTarget?.last_name }}</strong>;
            la actual quedará invalidada. Podrás verla una sola vez para compartirla.
          </p>
          <v-switch
            v-model="resetGenerate"
            color="primary"
            density="compact"
            hide-details
            label="Generar contraseña aleatoria automáticamente"
            class="mb-3"
          />
          <v-text-field
            v-if="!resetGenerate"
            v-model="resetPassword"
            :type="showResetPassword ? 'text' : 'password'"
            label="Nueva contraseña"
            :rules="[...rules.required, rules.minLength(8)]"
            :append-inner-icon="showResetPassword ? 'mdi-eye' : 'mdi-eye-off'"
            density="comfortable"
            hint="Mínimo 8 caracteres"
            persistent-hint
            autocomplete="new-password"
            @click:append-inner="showResetPassword = !showResetPassword"
          />
        </v-card-text>
        <v-card-actions class="pa-4 pt-0">
          <v-spacer />
          <v-btn variant="text" @click="resetDialog = false">Cancelar</v-btn>
          <v-btn
            color="warning"
            variant="flat"
            :loading="resetting"
            @click="onResetPassword"
          >
            Restablecer
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Edit Dialog -->
    <EmployeeForm
      :visible="showEditDialog"
      :employee="editingEmployee"
      :category-options="categoryOptions"
      @close="closeEditDialog"
      @save="onEditSave"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useServiceCategoryStore } from '@/modules/appointments/stores/service-category.store';
import { useServiceStore } from '@/modules/appointments/stores/service.store';
import { useAuthStore } from '@/shared/stores/auth.store';
import { useTenantStore } from '@/shared/stores/tenant.store';
import { useEmployeeStore } from '../stores/employee.store';
import { useNotification } from '@/shared/composables/useNotification';
import { useConfirm } from '@/shared/composables/useConfirm';
import PageHeader from '@/shared/components/PageHeader.vue';
import DataTable from '@/shared/components/DataTable.vue';
import EmployeeForm from '../components/EmployeeForm.vue';
import type { Employee } from '../types/employee.types';
import type { EmployeeFormData } from '../components/EmployeeForm.vue';
import { generatePassword } from '@/shared/utils/password';

const employeeStore = useEmployeeStore();
const categoryStore = useServiceCategoryStore();
const serviceStore = useServiceStore();
const authStore = useAuthStore();
const tenantStore = useTenantStore();
const notification = useNotification();
const { confirm } = useConfirm();

const headers = [
  { title: 'Miembro', key: 'full_name', sortable: false },
  { title: 'Rol', key: 'role', sortable: true },
  { title: 'Credencial', key: 'credential', sortable: false },
  { title: 'Categorías', key: 'services', sortable: false },
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

// Contraseña inicial visible para compartirla con el empleado
const showPassword = ref(true);

// Tarjeta de credenciales post-creación / post-reset
const credentialsDialog = ref(false);
const credentials = reactive({ email: '', password: '', phone: '' });
const whatsappHref = computed(() => {
  const digits = credentials.phone.replace(/\D/g, '');
  if (!/^\d{8}$/.test(digits)) return '';
  const text = encodeURIComponent(
    `Te comparto tus credenciales para entrar al sistema de ${tenantName.value}:\n\n` +
      `Usuario: ${credentials.email}\n` +
      `Contraseña: ${credentials.password}\n\n` +
      'Por seguridad, cambia esta contraseña al entrar (Mi Cuenta).',
  );
  return `https://wa.me/53${digits}?text=${text}`;
});

// Reset de credenciales
const resetDialog = ref(false);
const resetting = ref(false);
const resetTarget = ref<Employee | null>(null);
const resetGenerate = ref(true);
const resetPassword = ref('');
const showResetPassword = ref(false);

const tenantName = computed(() => tenantStore.tenant?.name || 'el negocio');

async function copyToClipboard(value: string, label: string) {
  try {
    await navigator.clipboard.writeText(value);
    notification.success(`${label} copiada al portapapeles`);
  } catch {
    notification.error('No se pudo copiar automáticamente');
  }
}

function phoneRule(v: string) {
  return !v?.trim() || /^\d{8}$/.test(v.trim()) || 'Número de 8 dígitos (el +53 es fijo)';
}

const form = reactive({
  first_name: '',
  last_name: '',
  email: '',
  password: '',
  role: 'employee' as 'admin' | 'employee',
  phone: '',
  color: '#1976D2',
  category_ids: [] as string[],
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

const categoryOptions = computed(() =>
  categoryStore.categories.map((c: any) => ({
    value: c.id,
    text: c.name,
  })),
);

const enabledServices = computed(() => {
  return (employee: Employee) => {
    const ids = new Set(employee.enabled_service_ids ?? []);
    return serviceStore.services.filter((s) => ids.has(s.id));
  };
});

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
    categoryStore.fetchCategories(),
    serviceStore.fetchServices(),
  ]);
  loading.value = false;
});

function openCreateDialog() {
  form.first_name = '';
  form.last_name = '';
  form.email = '';
  // Contraseña inicial autogenerada: el admin puede usarla tal cual,
  // editarla o borrarla y escribir una manual.
  form.password = generatePassword();
  form.role = 'employee';
  form.phone = '';
  form.color = '#1976D2';
  form.category_ids = [];
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
        phone: form.phone.trim() ? `+53${form.phone.trim()}` : undefined,
        color: form.color,
        category_ids: form.category_ids.length > 0 ? form.category_ids : undefined,
      }),
    });

    const result = await res.json();

    if (!res.ok || !result.success) {
      formError.value = result.error || 'Error al crear el empleado';
      return;
    }

    // Tarjeta de credenciales visible una sola vez (la contraseña la acaba
    // de escribir el admin y es la que comparte con el empleado).
    credentials.email = form.email.trim();
    credentials.password = form.password;
    credentials.phone = form.phone.trim();
    closeCreateDialog();
    alertMessage.value = `${form.first_name} ${form.last_name} fue agregado exitosamente. Puede iniciar sesión con ${form.email}.`;
    alertType.value = 'success';
    credentialsDialog.value = true;
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

function openResetDialog(employee: Employee) {
  resetTarget.value = employee;
  resetGenerate.value = true;
  resetPassword.value = '';
  showResetPassword.value = false;
  resetDialog.value = true;
}

async function onResetPassword() {
  if (!resetTarget.value) return;
  if (!resetGenerate.value && resetPassword.value.length < 8) return;

  resetting.value = true;
  try {
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-team-member-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.session?.access_token ?? ''}`,
      },
      body: JSON.stringify({
        employee_id: resetTarget.value.id,
        password: resetGenerate.value ? undefined : resetPassword.value,
      }),
    });

    const result = await res.json();

    if (!res.ok || !result.success) {
      notification.error(result.error || 'Error al restablecer la contraseña');
      return;
    }

    resetDialog.value = false;
    credentials.email = result.credentials.email || resetTarget.value.email || '';
    credentials.password = result.credentials.password;
    credentials.phone = resetTarget.value.phone || '';
    credentialsDialog.value = true;

    alertMessage.value = `Contraseña restablecida para ${resetTarget.value.first_name} ${resetTarget.value.last_name}.`;
    alertType.value = 'success';
    await employeeStore.fetchEmployeesWithRoles();
  } catch {
    notification.error('Error de conexión. Intente de nuevo.');
  } finally {
    resetting.value = false;
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
    // Categorías asignadas + sincronización de los servicios que ofrece
    await employeeStore.updateEmployeeCategories(editingEmployee.value.id, data.category_ids);
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

<style scoped>
.phone-prefix {
  color: rgba(0, 0, 0, 0.6);
  font-weight: 500;
  line-height: 1.2;
}

.credential-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
</style>
