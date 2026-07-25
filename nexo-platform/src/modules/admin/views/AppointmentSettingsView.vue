<template>
  <div>
    <PageHeader title="Configuración de Citas" subtitle="Políticas de reservas, auto-inicio y clientes bloqueados">
      <template #actions>
        <v-btn color="primary" :loading="saving" @click="save">
          <v-icon start>mdi-content-save</v-icon>
          Guardar Cambios
        </v-btn>
      </template>
    </PageHeader>

    <v-row>
      <v-col cols="12" md="6">
        <v-card class="pa-6">
          <FormSection title="Inicio Automático">
            <v-switch
              v-model="form.auto_start"
              label="Activar inicio automático de citas"
              hint="Las citas confirmadas pasarán a 'en curso' automáticamente al iniciar la hora"
              persistent-hint
              color="primary"
            />
            <v-alert
              v-if="form.auto_start"
              type="info"
              variant="tonal"
              class="mt-4"
              density="compact"
            >
              Un job periódico revisará las citas confirmadas y las cambiará a "en curso" cuando
              llegue la hora (con tolerancia configurable).
            </v-alert>
          </FormSection>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card class="pa-6">
          <FormSection title="Política de No-Show">
            <v-text-field
              v-model.number="form.no_show_policy.grace_period_minutes"
              label="Tolerancia (minutos)"
              type="number"
              min="0"
              max="120"
              hint="Minutos después del inicio en que se marca como no-show"
              persistent-hint
            />
            <v-text-field
              v-model.number="form.no_show_policy.max_no_shows"
              label="Máximo no-shows para bloquear"
              type="number"
              min="1"
              max="20"
              hint="Número de no-shows antes de bloquear al cliente"
              persistent-hint
              class="mt-4"
            />
            <v-text-field
              v-model.number="form.no_show_policy.block_duration_days"
              label="Duración del bloqueo (días)"
              type="number"
              min="1"
              max="365"
              hint="Días que el cliente queda bloqueado tras exceder el límite"
              persistent-hint
              class="mt-4"
            />
          </FormSection>
        </v-card>
      </v-col>
    </v-row>

    <v-card class="pa-6 mt-4">
      <FormSection title="Política de Cancelación">
        <v-row>
          <v-col cols="12" md="4">
            <v-text-field
              v-model.number="form.cancellation_policy_hours"
              label="Horas mínimas de anticipación"
              type="number"
              min="0"
              max="168"
              hint="Horas antes de la cita para poder cancelar sin penalización"
              persistent-hint
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-switch
              v-model="form.require_reason_cancel"
              label="Requerir motivo al cancelar"
              color="primary"
              hide-details
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-switch
              v-model="form.allow_reschedule"
              label="Permitir reprogramar"
              color="primary"
              hide-details
            />
          </v-col>
        </v-row>
      </FormSection>
    </v-card>

    <!-- Booking Windows Section -->
    <v-card class="pa-6 mt-4">
      <div class="d-flex align-center ga-3 mb-4">
        <v-icon color="primary" size="small">mdi-calendar-range</v-icon>
        <div>
          <div class="text-subtitle-1 font-weight-medium">Ventanas de Disponibilidad</div>
          <div class="text-caption text-medium-emphasis">
            Configura disponibilidad por rango de fechas específico. Prioridad sobre horarios recurrentes.
          </div>
        </div>
        <v-spacer />
        <v-btn
          color="primary"
          variant="tonal"
          size="small"
          prepend-icon="mdi-plus"
          @click="openCreateWindow"
        >
          Agregar ventana
        </v-btn>
      </div>

      <v-alert
        v-if="bookingWindows.length === 0"
        type="info"
        variant="tonal"
        density="compact"
      >
        No hay ventanas de disponibilidad configuradas. Los empleados usan sus horarios recurrentes por defecto.
      </v-alert>

      <div v-else>
        <v-chip
          v-for="bw in bookingWindows"
          :key="bw.id"
          class="ma-1"
          :color="bw.is_active ? 'primary' : 'grey'"
          variant="tonal"
          closable
          @click:close="deleteWindow(bw)"
        >
          <v-icon start size="small">mdi-calendar-range</v-icon>
          {{ bw.start_date }} → {{ bw.end_date }}, {{ bw.start_time?.slice(0, 5) }}-{{ bw.end_time?.slice(0, 5) }}
          <span class="text-caption ml-1">({{ bw.slot_mode === 'fixed' ? `fixed ${bw.slot_interval_minutes}m` : 'flex' }})</span>
        </v-chip>
      </div>
    </v-card>

    <BookingWindowsDialog
      :visible="showWindowDialog"
      :window="editingWindow"
      @close="closeWindowDialog"
      @save="onWindowSave"
    />

    <!-- Resources Section -->
    <v-card class="pa-6 mt-4">
      <div class="d-flex align-center ga-3 mb-4">
        <v-icon color="primary" size="small">mdi-office-building</v-icon>
        <div>
          <div class="text-subtitle-1 font-weight-medium">Recursos</div>
          <div class="text-caption text-medium-emphasis">
            Habitaciones, equipos y vehículos disponibles para las reservas.
          </div>
        </div>
        <v-spacer />
        <v-btn color="primary" variant="tonal" size="small" prepend-icon="mdi-plus" @click="openResourceForm()">
          Agregar recurso
        </v-btn>
      </div>

      <v-alert v-if="resources.length === 0" type="info" variant="tonal" density="compact">
        No hay recursos configurados. Los recursos se asignan a servicios para controlar disponibilidad.
      </v-alert>

      <v-list v-else density="compact" lines="two">
        <v-list-item
          v-for="resource in resources"
          :key="resource.id"
          :title="resource.name"
          :subtitle="`${resource.type} — Cap: ${resource.capacity}`"
        >
          <template #append>
            <v-btn icon="mdi-pencil" size="x-small" variant="text" @click="openResourceForm(resource)" />
            <v-btn icon="mdi-delete" size="x-small" variant="text" color="error" @click="deleteResource(resource)" />
          </template>
        </v-list-item>
      </v-list>
    </v-card>

    <v-dialog v-model="showResourceDialog" max-width="400" persistent>
      <v-card>
        <v-card-title class="text-h6">{{ editingResource ? 'Editar' : 'Nuevo' }} Recurso</v-card-title>
        <v-card-text>
          <v-text-field v-model="resourceForm.name" label="Nombre *" :rules="[v => !!v || 'Requerido']" class="mb-2" />
          <v-select v-model="resourceForm.type" :items="resourceTypes" label="Tipo *" class="mb-2" />
          <v-text-field v-model.number="resourceForm.capacity" label="Capacidad" type="number" min="1" class="mb-2" />
          <v-textarea v-model="resourceForm.description" label="Descripción" rows="2" />
        </v-card-text>
        <v-card-actions class="pa-4 pt-0">
          <v-spacer />
          <v-btn variant="text" @click="showResourceDialog = false">Cancelar</v-btn>
          <v-btn color="primary" variant="flat" :loading="savingResource" @click="saveResource">Guardar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3000">
      {{ snackbarText }}
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue';
import { useTenantStore } from '@/shared/stores/tenant.store';
import { bookingRepository } from '@/modules/appointments/repositories/booking.repository';
import { useResourceStore } from '@/modules/appointments/stores/resource.store';
import { useAuthStore } from '@/shared/stores/auth.store';
import PageHeader from '@/shared/components/PageHeader.vue';
import FormSection from '@/shared/components/FormSection.vue';
import BookingWindowsDialog from '@/modules/appointments/components/BookingWindowsDialog.vue';
import type { BookingWindow } from '@/modules/appointments/types/booking.types';
import type { Resource } from '@/modules/appointments/types/resource.types';

const tenantStore = useTenantStore();
const authStore = useAuthStore();
const resourceStore = useResourceStore();
const saving = ref(false);
const snackbar = ref(false);
const snackbarText = ref('');
const snackbarColor = ref('success');

const form = reactive({
  auto_start: false,
  no_show_policy: {
    grace_period_minutes: 15,
    max_no_shows: 2,
    block_duration_days: 30,
  },
  cancellation_policy_hours: 24,
  require_reason_cancel: false,
  allow_reschedule: true,
});

// --- Booking Windows ---
const bookingWindows = ref<BookingWindow[]>([]);
const showWindowDialog = ref(false);
const editingWindow = ref<BookingWindow | null>(null);

async function loadBookingWindows() {
  const tenantId = authStore.user?.tenant_id;
  if (!tenantId) return;
  bookingWindows.value = await bookingRepository.getBookingWindows(tenantId);
}

function openCreateWindow() {
  editingWindow.value = null;
  showWindowDialog.value = true;
}

function closeWindowDialog() {
  showWindowDialog.value = false;
  editingWindow.value = null;
}

async function onWindowSave(data: any) {
  const tenantId = authStore.user?.tenant_id;
  if (!tenantId) return;
  try {
    if (data.id) {
      await bookingRepository.deleteBookingWindow(data.id);
    }
    await bookingRepository.createBookingWindow(tenantId, data);
    await loadBookingWindows();
    showWindowDialog.value = false;
    notify('Ventana guardada correctamente', 'success');
  } catch {
    notify('Error al guardar la ventana', 'error');
  }
}

async function deleteWindow(bw: BookingWindow) {
  try {
    await bookingRepository.deleteBookingWindow(bw.id);
    await loadBookingWindows();
    notify('Ventana eliminada', 'success');
  } catch {
    notify('Error al eliminar la ventana', 'error');
  }
}

// --- Resources ---
const resources = ref<Resource[]>([]);
const showResourceDialog = ref(false);
const editingResource = ref<Resource | null>(null);
const savingResource = ref(false);
const resourceTypes = [
  { value: 'room', text: 'Habitación/Sala' },
  { value: 'equipment', text: 'Equipo' },
  { value: 'vehicle', text: 'Vehículo' },
  { value: 'other', text: 'Otro' },
];
const resourceForm = reactive({
  name: '',
  type: 'room' as Resource['type'],
  capacity: 1,
  description: '',
});

async function loadResources() {
  await resourceStore.fetchResources();
  resources.value = resourceStore.resources;
}

function openResourceForm(resource?: Resource) {
  editingResource.value = resource ?? null;
  if (resource) {
    resourceForm.name = resource.name;
    resourceForm.type = resource.type;
    resourceForm.capacity = resource.capacity;
    resourceForm.description = resource.description ?? '';
  } else {
    resourceForm.name = '';
    resourceForm.type = 'room';
    resourceForm.capacity = 1;
    resourceForm.description = '';
  }
  showResourceDialog.value = true;
}

async function saveResource() {
  if (!resourceForm.name) return;
  savingResource.value = true;
  try {
    if (editingResource.value) {
      await resourceStore.updateResource(editingResource.value.id, { ...resourceForm });
    } else {
      await resourceStore.createResource({ ...resourceForm, is_active: true });
    }
    await loadResources();
    showResourceDialog.value = false;
    notify(editingResource.value ? 'Recurso actualizado' : 'Recurso creado', 'success');
  } catch {
    notify('Error al guardar recurso', 'error');
  } finally {
    savingResource.value = false;
  }
}

async function deleteResource(resource: Resource) {
  try {
    await resourceStore.removeResource(resource.id);
    await loadResources();
    notify('Recurso eliminado', 'success');
  } catch {
    notify('Error al eliminar recurso', 'error');
  }
}

function notify(text: string, color: string) {
  snackbarText.value = text;
  snackbarColor.value = color;
  snackbar.value = true;
}

// --- Lifecycle ---
onMounted(async () => {
  const config = (tenantStore.tenant as any)?.config?.appointments;
  if (config) {
    form.auto_start = config.auto_start ?? false;
    if (config.no_show_policy) {
      form.no_show_policy.grace_period_minutes = config.no_show_policy.grace_period_minutes ?? 15;
      form.no_show_policy.max_no_shows = config.no_show_policy.max_no_shows ?? 2;
      form.no_show_policy.block_duration_days = config.no_show_policy.block_duration_days ?? 30;
    }
    form.cancellation_policy_hours = config.cancellation_policy_hours ?? 24;
    form.require_reason_cancel = config.require_reason_cancel ?? false;
    form.allow_reschedule = config.allow_reschedule ?? true;
  }
  await loadBookingWindows();
  await loadResources();
});

async function save() {
  saving.value = true;
  try {
    await tenantStore.updateTenant({
      config: {
        ...((tenantStore.tenant as any)?.config ?? {}),
        appointments: {
          auto_start: form.auto_start,
          no_show_policy: { ...form.no_show_policy },
          cancellation_policy_hours: form.cancellation_policy_hours,
          require_reason_cancel: form.require_reason_cancel,
          allow_reschedule: form.allow_reschedule,
        },
      },
    } as any);
    snackbarText.value = 'Configuración guardada correctamente';
    snackbarColor.value = 'success';
    snackbar.value = true;
  } catch {
    snackbarText.value = 'Error al guardar la configuración';
    snackbarColor.value = 'error';
    snackbar.value = true;
  } finally {
    saving.value = false;
  }
}
</script>
