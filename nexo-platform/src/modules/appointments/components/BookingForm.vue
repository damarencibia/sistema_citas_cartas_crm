<template>
  <v-dialog
    :model-value="visible"
    max-width="560"
    persistent
    @update:model-value="emit('close')"
  >
    <v-card>
      <v-card-title class="text-h6 d-flex align-center">
        {{ editing ? 'Editar Reserva' : 'Nueva Reserva' }}
        <v-spacer />
        <v-btn
          icon="mdi-close"
          size="small"
          variant="text"
          @click="emit('close')"
        />
      </v-card-title>
      <v-card-text>
        <v-form ref="formRef" @submit.prevent="onSubmit">
          <!-- Step 1: Categoría -->
          <div class="mb-5">
            <div class="text-subtitle-2 font-weight-bold text-primary mb-2">
              <v-icon size="small" class="mr-1">mdi-numeric-1-circle-outline</v-icon>
              1. Elige una Categoría
            </div>
            <v-select
              v-model="form.category_id"
              :items="categoryOptions"
              item-title="text"
              item-value="value"
              placeholder="Elige una categoría..."
              :rules="[(v) => !!v || 'Selecciona una categoría']"
              @update:model-value="onCategoryChange"
            />
          </div>

          <!-- Step 2: Servicio -->
          <div class="mb-5">
            <div class="text-subtitle-2 font-weight-bold text-primary mb-2">
              <v-icon size="small" class="mr-1">mdi-numeric-2-circle-outline</v-icon>
              2. Selecciona un Servicio
            </div>
            <v-select
              v-model="form.service_id"
              :items="serviceOptions"
              item-title="text"
              item-value="value"
              placeholder="Elige un servicio..."
              :disabled="!form.category_id"
              :rules="[(v) => !!v || 'Selecciona un servicio']"
              @update:model-value="onServiceChange"
            />
          </div>

          <!-- Step 3: Fecha y Hora -->
          <div class="mb-5">
            <div class="text-subtitle-2 font-weight-bold text-primary mb-2">
              <v-icon size="small" class="mr-1">mdi-numeric-3-circle-outline</v-icon>
              3. Elige Fecha y Hora
            </div>
            <v-text-field
              v-model="form.date"
              label="Fecha"
              type="date"
              :min="minDate"
              :rules="[(v) => !!v || 'Selecciona una fecha']"
              class="mb-2"
              @update:model-value="onDateChange"
            />
            <TimeSlotPicker
              v-model="form.start_time"
              :slots="availability.slots.value"
              :date="form.date"
              :loading="slotsLoading"
              @join-waitlist="handleJoinWaitlist"
              @join-waitlist-exact="handleJoinWaitlistExact"
              @join-waitlist-flexible="handleJoinWaitlistFlexible"
            />
            <v-text-field
              v-if="isGroupService"
              v-model.number="form.participant_count"
              label="Participantes"
              type="number"
              :min="1"
              :max="selectedService?.max_participants ?? 1"
              :rules="[
                (v) => v >= 1 || 'Mínimo 1',
                (v) => v <= (selectedService?.max_participants ?? 1) || 'Máximo ' + (selectedService?.max_participants ?? 1),
              ]"
              class="mb-2"
            />
            <ResourceSelect
              v-if="hasResources"
              v-model="form.resource_id"
              label="Recurso (opcional)"
            />
          </div>

          <!-- Step 4: Empleado -->
          <div class="mb-5">
            <div class="text-subtitle-2 font-weight-bold text-primary mb-2">
              <v-icon size="small" class="mr-1">mdi-numeric-4-circle-outline</v-icon>
              4. Empleado
            </div>
            <div v-if="autoAssign && assignedEmployee" class="d-flex align-center ga-2">
              <v-chip color="primary" variant="tonal" prepend-icon="mdi-account-check">
                {{ assignedEmployee.first_name }} {{ assignedEmployee.last_name }}
              </v-chip>
              <v-btn
                size="small"
                variant="text"
                color="primary"
                @click="enableManualEmployee"
              >
                Cambiar
              </v-btn>
            </div>
            <EmployeeSelect
              v-else
              v-model="form.employee_id"
              :allowed-ids="serviceEmployeeIds"
              @update:model-value="onEmployeeChange"
            />
            <div v-if="!autoAssign && selectedService?.employee_id" class="mt-1">
              <v-btn
                size="small"
                variant="text"
                color="primary"
                @click="enableAutoAssign"
              >
                Auto-asignar empleado
              </v-btn>
            </div>
          </div>

          <!-- Step 5: Datos del Cliente -->
          <div class="mb-2">
            <div class="text-subtitle-2 font-weight-bold text-primary mb-2">
              <v-icon size="small" class="mr-1">mdi-numeric-5-circle-outline</v-icon>
              5. Tus Datos
            </div>
            <v-text-field
              v-model="form.customer_name"
              label="Nombre *"
              :rules="[(v) => !!v || 'Requerido']"
              class="mb-2"
            />
            <v-row>
              <v-col cols="6">
                <v-text-field
                  v-model="form.customer_phone"
                  label="Teléfono *"
                  :rules="[(v) => !!v || 'Requerido']"
                />
              </v-col>
              <v-col cols="6">
                <v-text-field
                  v-model="form.customer_email"
                  label="Email (opcional)"
                  type="email"
                />
              </v-col>
            </v-row>
            <v-textarea v-model="form.notes" label="Notas (opcional)" rows="2" />
          </div>
        </v-form>
      </v-card-text>
      <v-card-actions class="pa-4 pt-0">
        <v-spacer />
        <v-btn variant="text" @click="emit('close')">Cancelar</v-btn>
        <v-btn
          color="primary"
          variant="flat"
          :loading="submitting"
          @click="onSubmit"
        >
          {{ editing ? 'Guardar' : 'Crear Reserva' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <WaitlistDialog
    :visible="showWaitlistDialog"
    :service-id="form.service_id"
    :employee-id="form.employee_id || undefined"
    :date="form.date"
    :preselected-time="waitlistTime"
    :preselected-preference="waitlistPreference"
    @close="onWaitlistClose"
    @save="onWaitlistSave"
  />
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue';
import { useServiceStore } from '../stores/service.store';
import { useServiceCategoryStore } from '../stores/service-category.store';
import { useEmployeeStore } from '../stores/employee.store';
import { useBookingStore } from '../stores/booking.store';
import { useResourceStore } from '../stores/resource.store';
import { useAvailability } from '../composables/useAvailability';
import { useAuthStore } from '@/shared/stores/auth.store';
import EmployeeSelect from './EmployeeSelect.vue';
import TimeSlotPicker from './TimeSlotPicker.vue';
import ResourceSelect from './ResourceSelect.vue';
import WaitlistDialog from './WaitlistDialog.vue';
import type { Booking, CreateBookingDTO } from '../types/booking.types';

const props = defineProps<{
  visible: boolean;
  booking?: Booking | null;
}>();

const emit = defineEmits<{
  close: [];
  save: [data: CreateBookingDTO];
}>();

const serviceStore = useServiceStore();
const categoryStore = useServiceCategoryStore();
const employeeStore = useEmployeeStore();
const bookingStore = useBookingStore();
const resourceStore = useResourceStore();
const availability = useAvailability();
const authStore = useAuthStore();
const formRef = ref();
const editing = ref(false);
const submitting = ref(false);
const slotsLoading = computed(() => availability.loading.value);
const minDate = new Date().toISOString().split('T')[0];
const showWaitlistDialog = ref(false);
const waitlistTime = ref<string | undefined>(undefined);
const waitlistPreference = ref<'exact' | 'flexible' | undefined>(undefined);
const autoAssign = ref(false);

const form = reactive({
  category_id: '',
  service_id: '',
  employee_id: '',
  date: '',
  start_time: '',
  customer_name: '',
  customer_email: '',
  customer_phone: '',
  notes: '',
  participant_count: 1,
  resource_id: null as string | null,
});

const categoryOptions = computed(() =>
  categoryStore.activeCategories.map((c) => ({
    value: c.id,
    text: c.name,
  })),
);

const servicesByCategory = computed(() =>
  form.category_id
    ? serviceStore.activeServices.filter((s) => s.category_id === form.category_id)
    : [],
);

const serviceOptions = computed(() =>
  servicesByCategory.value.map((s) => ({
    value: s.id,
    text: s.name + ' (' + s.duration_minutes + ' min)',
  })),
);

const selectedService = computed(() =>
  serviceStore.activeServices.find((s) => s.id === form.service_id),
);

const isGroupService = computed(() =>
  (selectedService.value?.max_participants ?? 1) > 1,
);

const hasResources = computed(() =>
  resourceStore.activeResources.length > 0,
);

const serviceEmployeeIds = computed(() => {
  if (!selectedService.value?.employee_id) return [];
  return [selectedService.value.employee_id];
});

const assignedEmployee = computed(() => {
  if (!selectedService.value?.employee_id) return null;
  return employeeStore.employees.find((e) => e.id === selectedService.value!.employee_id) ?? null;
});

function onCategoryChange() {
  form.service_id = '';
  form.employee_id = '';
  form.start_time = '';
  availability.clear();
  autoAssign.value = false;
}

function onServiceChange() {
  form.start_time = '';
  form.employee_id = '';
  availability.clear();
  autoAssign.value = false;

  const svc = selectedService.value;
  if (svc?.employee_id) {
    const emp = employeeStore.employees.find((e) => e.id === svc.employee_id);
    if (emp) {
      form.employee_id = svc.employee_id;
      autoAssign.value = true;
    }
  }

  if (form.service_id && form.date) {
    loadSlots();
  }
}

function onDateChange() {
  form.start_time = '';
  availability.clear();
  if (form.service_id && form.employee_id && form.date) {
    loadSlots();
  }
}

function onEmployeeChange() {
  form.start_time = '';
  availability.clear();
  autoAssign.value = false;
  if (form.service_id && form.employee_id && form.date) {
    loadSlots();
  }
}

function enableManualEmployee() {
  autoAssign.value = false;
  form.employee_id = '';
  availability.clear();
}

function enableAutoAssign() {
  const svc = selectedService.value;
  if (svc?.employee_id) {
    form.employee_id = svc.employee_id;
    autoAssign.value = true;
    availability.clear();
    if (form.date) loadSlots();
  }
}

async function loadSlots() {
  const svc = serviceStore.activeServices.find((s) => s.id === form.service_id);
  if (!svc || !form.employee_id || !form.date) return;
  const tenantId = authStore.user?.tenant_id;
  if (!tenantId) return;
  await availability.fetchSlots(tenantId, form.employee_id, form.date, svc.duration_minutes, form.service_id);
}

watch(
  () => props.booking,
  (b) => {
    if (b) {
      editing.value = true;
      const svc = serviceStore.activeServices.find((s) => s.id === b.service_id);
      form.category_id = svc?.category_id ?? '';
      form.service_id = b.service_id;
      form.employee_id = b.employee_id;
      form.date = b.date;
      form.start_time = b.start_time;
      form.customer_name = b.customer_name ?? '';
      form.customer_email = b.customer_email ?? '';
      form.customer_phone = b.customer_phone ?? '';
      form.notes = b.notes ?? '';
      form.participant_count = b.participant_count ?? 1;
      form.resource_id = b.resource_id ?? null;
      autoAssign.value = false;
    } else {
      editing.value = false;
      form.category_id = '';
      form.service_id = '';
      form.employee_id = '';
      form.date = '';
      form.start_time = '';
      form.customer_name = '';
      form.customer_email = '';
      form.customer_phone = '';
      form.notes = '';
      form.participant_count = 1;
      form.resource_id = null;
      availability.clear();
      autoAssign.value = false;
    }
  },
  { immediate: true },
);

watch(
  () => props.visible,
  (v) => {
    if (!v) {
      availability.clear();
    } else {
      categoryStore.fetchCategories();
      serviceStore.fetchServices();
      resourceStore.fetchResources();
      if (!editing.value) {
        form.date = new Date().toISOString().split('T')[0];
        if (form.service_id && form.employee_id) {
          loadSlots();
        }
      }
    }
  },
);

async function onSubmit() {
  const { valid } = await formRef.value.validate();
  if (!valid) return;
  submitting.value = true;
  const payload: CreateBookingDTO = {
    service_id: form.service_id,
    employee_id: form.employee_id,
    date: form.date,
    start_time: form.start_time,
    customer_name: form.customer_name || undefined,
    customer_email: form.customer_email || undefined,
    customer_phone: form.customer_phone || undefined,
    notes: form.notes || undefined,
    participant_count: form.participant_count,
    resource_id: form.resource_id ?? undefined,
    source: 'manual',
  };
  emit('save', payload);
  submitting.value = false;
}

function handleJoinWaitlist() {
  waitlistTime.value = undefined;
  waitlistPreference.value = undefined;
  showWaitlistDialog.value = true;
}

function handleJoinWaitlistExact(time: string) {
  waitlistTime.value = time;
  waitlistPreference.value = 'exact';
  showWaitlistDialog.value = true;
}

function handleJoinWaitlistFlexible() {
  waitlistTime.value = undefined;
  waitlistPreference.value = 'flexible';
  showWaitlistDialog.value = true;
}

function onWaitlistClose() {
  showWaitlistDialog.value = false;
  waitlistTime.value = undefined;
  waitlistPreference.value = undefined;
}

async function onWaitlistSave(data: { customer_name: string; customer_email: string; customer_phone: string; preference: 'exact' | 'flexible'; time?: string }) {
  try {
    await bookingStore.joinWaitlist({
      service_id: form.service_id,
      employee_id: form.employee_id || undefined,
      preferred_date: form.date,
      preferred_time_start: data.time,
      customer_name: data.customer_name,
      customer_email: data.customer_email,
      customer_phone: data.customer_phone || undefined,
      preference: data.preference,
    });
    showWaitlistDialog.value = false;
    waitlistTime.value = undefined;
    waitlistPreference.value = undefined;
  } catch {
    // Error handled by store
  }
}
</script>
