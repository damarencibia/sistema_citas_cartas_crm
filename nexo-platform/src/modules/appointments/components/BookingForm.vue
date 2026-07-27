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
        <v-alert
          v-if="clientBlock.is_blocked"
          type="error"
          variant="tonal"
          density="compact"
          class="mb-4"
          icon="mdi-account-off"
        >
          <div class="font-weight-medium">Cliente bloqueado</div>
          <div class="text-caption">
            Hasta el {{ clientBlock.blocked_until }} por {{ clientBlock.no_show_count }} no-show(s).
            No se pueden crear reservas para este cliente.
          </div>
        </v-alert>

        <v-alert
          v-else-if="clientBlock.no_show_count > 0"
          type="warning"
          variant="tonal"
          density="compact"
          class="mb-4"
          icon="mdi-alert-outline"
        >
          <div class="text-caption">
            Este cliente tiene {{ clientBlock.no_show_count }} no-show(s) registrado(s).
          </div>
        </v-alert>

        <v-form ref="formRef" @submit.prevent="onSubmit">
          <v-select
            v-model="form.service_id"
            :items="serviceOptions"
            item-title="text"
            item-value="value"
            label="Servicio *"
            :rules="[(v) => !!v || 'Selecciona un servicio']"
            class="mb-2"
            @update:model-value="onServiceChange"
          />
          <EmployeeSelect
            v-model="form.employee_id"
            label="Empleado *"
            :rules="[(v) => !!v || 'Selecciona un empleado']"
            class="mb-2"
          />
          <v-text-field
            v-model="form.date"
            label="Fecha *"
            type="date"
            :min="minDate"
            :rules="[(v) => !!v || 'Selecciona una fecha']"
            class="mb-2"
          />
          <TimeSlotPicker
            v-model="form.start_time"
            :slots="availability.slots.value"
            :date="form.date"
            :loading="slotsLoading"
            :show-waitlist="noSlotsAvailable && !isGroupService"
            label="Hora disponible *"
            @join-waitlist="handleJoinWaitlist"
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
              (v) => v <= (selectedService?.max_participants ?? 1) || `Máximo ${selectedService?.max_participants}`,
            ]"
            class="mb-2"
          />
          <ResourceSelect
            v-if="hasResources"
            v-model="form.resource_id"
            label="Recurso (opcional)"
            class="mb-2"
          />
          <v-divider class="my-4" />
          <v-text-field
            v-model="form.customer_name"
            label="Nombre del cliente *"
            :rules="[(v) => !!v || 'Requerido']"
            class="mb-2"
          />
          <v-row>
            <v-col cols="6">
              <v-text-field
                v-model="form.customer_email"
                label="Email *"
                type="email"
                :rules="[(v) => !!v || 'Requerido']"
              />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model="form.customer_phone"
                label="Teléfono *"
                :rules="[(v) => !!v || 'Requerido']"
              />
            </v-col>
          </v-row>
          <v-textarea v-model="form.notes" label="Notas (opcional)" rows="2" />

          <v-divider class="my-4" />
          <v-switch v-model="showRecurrence" label="Cita recurrente" color="primary" hide-details class="mb-2" />
          <RecurrencePicker
            v-if="showRecurrence"
            v-model="recurrenceData"
            :min-date="form.date || minDate"
          />
        </v-form>
      </v-card-text>
      <v-card-actions class="pa-4 pt-0">
        <v-spacer />
        <v-btn variant="text" @click="emit('close')">Cancelar</v-btn>
        <v-btn
          color="primary"
          variant="flat"
          :loading="submitting"
          :disabled="clientBlock.is_blocked"
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
    @close="showWaitlistDialog = false"
    @save="onWaitlistSave"
  />
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue';
import { useServiceStore } from '../stores/service.store';
import { useBookingStore } from '../stores/booking.store';
import { useResourceStore } from '../stores/resource.store';
import { useAvailability } from '../composables/useAvailability';
import { useAuthStore } from '@/shared/stores/auth.store';
import EmployeeSelect from './EmployeeSelect.vue';
import TimeSlotPicker from './TimeSlotPicker.vue';
import ResourceSelect from './ResourceSelect.vue';
import WaitlistDialog from './WaitlistDialog.vue';
import RecurrencePicker from './RecurrencePicker.vue';
import type { Booking, CreateBookingDTO, ClientBlockCheck, RecurrenceData } from '../types/booking.types';

const props = defineProps<{
  visible: boolean;
  booking?: Booking | null;
}>();

const emit = defineEmits<{
  close: [];
  save: [data: CreateBookingDTO];
}>();

const serviceStore = useServiceStore();
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
const showRecurrence = ref(false);
const recurrenceData = ref<RecurrenceData>({
  enabled: false,
  frequency: 'weekly',
  day_of_week: null,
  day_of_month: null,
  preferred_time: '09:00',
  start_date: '',
  end_date: '',
});
const noSlotsAvailable = computed<boolean>(() =>
  availability.slots.value.length === 0 && !availability.loading.value && form.date !== '' && form.start_time === '',
);

const clientBlock = reactive<ClientBlockCheck>({
  is_blocked: false,
  blocked_until: null,
  no_show_count: 0,
});

let emailCheckTimeout: ReturnType<typeof setTimeout> | null = null;

const form = reactive({
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

const serviceOptions = computed(() =>
  serviceStore.activeServices.map((s) => ({
    value: s.id,
    text: `${s.name} (${s.duration_minutes} min)`,
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

function onServiceChange() {
  form.start_time = '';
  availability.clear();
  if (form.service_id && form.employee_id && form.date) {
    loadSlots();
  }
}

async function loadSlots() {
  const service = serviceStore.activeServices.find((s) => s.id === form.service_id);
  if (!service || !form.employee_id || !form.date) return;
  const tenantId = authStore.user?.tenant_id;
  if (!tenantId) return;
  await availability.fetchSlots(tenantId, form.employee_id, form.date, service.duration_minutes, form.service_id);
}

async function checkClientBlockStatus(email: string) {
  if (!email || !email.includes('@')) {
    clientBlock.is_blocked = false;
    clientBlock.blocked_until = null;
    clientBlock.no_show_count = 0;
    return;
  }
  const result = await bookingStore.checkClientBlock(email);
  Object.assign(clientBlock, result);
}

watch(
  () => form.customer_email,
  (email) => {
    if (emailCheckTimeout) clearTimeout(emailCheckTimeout);
    emailCheckTimeout = setTimeout(() => {
      checkClientBlockStatus(email);
    }, 500);
  },
);

watch(
  () => props.booking,
  (b) => {
    if (b) {
      editing.value = true;
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
    } else {
      editing.value = false;
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
      clientBlock.is_blocked = false;
      clientBlock.blocked_until = null;
      clientBlock.no_show_count = 0;
    }
  },
  { immediate: true },
);

watch(
  () => form.employee_id,
  () => {
    form.start_time = '';
    availability.clear();
    if (form.service_id && form.employee_id && form.date) {
      loadSlots();
    }
  },
);

watch(
  () => form.date,
  () => {
    form.start_time = '';
    availability.clear();
    if (form.service_id && form.employee_id && form.date) {
      loadSlots();
    }
  },
);

watch(
  () => props.visible,
  (v) => {
    if (!v) {
      availability.clear();
      clientBlock.is_blocked = false;
      clientBlock.blocked_until = null;
      clientBlock.no_show_count = 0;
      showRecurrence.value = false;
      recurrenceData.value = { enabled: false, frequency: 'weekly', day_of_week: null, day_of_month: null, preferred_time: '09:00', start_date: '', end_date: '' };
    } else {
      resourceStore.fetchResources();
    }
  },
);

async function onSubmit() {
  const { valid } = await formRef.value.validate();
  if (!valid) return;
  if (clientBlock.is_blocked) return;
  submitting.value = true;
  const payload: any = { ...form, resource_id: form.resource_id ?? undefined };
  if (showRecurrence.value && recurrenceData.value.enabled) {
    payload.recurrence = { ...recurrenceData.value };
  }
  emit('save', payload);
  submitting.value = false;
}

function handleJoinWaitlist() {
  showWaitlistDialog.value = true;
}

async function onWaitlistSave(data: { customer_name: string; customer_email: string; customer_phone: string; preference: 'exact' | 'flexible' }) {
  try {
    await bookingStore.joinWaitlist({
      service_id: form.service_id,
      employee_id: form.employee_id || undefined,
      preferred_date: form.date,
      customer_name: data.customer_name,
      customer_email: data.customer_email,
      customer_phone: data.customer_phone || undefined,
      preference: data.preference,
    });
    showWaitlistDialog.value = false;
  } catch {
    // Error handled by store
  }
}
</script>
