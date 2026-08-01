<!-- eslint-disable vue/valid-v-slot -->
<template>
  <div class="public-layout">
    <v-container class="py-8" max-width="800">
      <div class="text-center mb-6">
        <div v-if="tenant" class="d-flex align-center justify-center ga-2 mb-3">
          <v-avatar v-if="tenant.logo_url" :image="tenant.logo_url" size="40" />
          <v-avatar v-else color="primary" size="40">
            <span class="text-white font-weight-bold">{{ (tenant.name || 'N')[0] }}</span>
          </v-avatar>
          <span class="font-weight-bold text-body-1">{{ tenant.name }}</span>
        </div>
        <h1 class="text-h4 font-weight-bold">Reserva tu Cita</h1>
        <p class="text-body-1 text-medium-emphasis">En pocos pasos, sin complicaciones.</p>
        <v-progress-linear
          v-if="!confirmed"
          :model-value="bookingProgress"
          color="primary"
          height="6"
          rounded
          class="mx-auto mt-4"
          style="max-width: 420px"
        />
      </div>

      <v-alert
        v-if="bookingError"
        type="error"
        variant="tonal"
        class="mb-4"
        closable
        @click:close="bookingError = null"
      >
        {{ bookingError }}
      </v-alert>

      <v-stepper
        v-if="!confirmed"
        v-model="step"
        :items="steps"
        alt-labels
        non-linear
      >
        <template #item.1>
          <div class="pa-4">
            <h3 class="text-subtitle-1 font-weight-medium mb-4">Selecciona un servicio</h3>
            <div v-if="loading" class="text-center pa-4">
              <v-progress-circular indeterminate color="primary" />
            </div>
            <template v-for="cat in categoriesWithServices" :key="cat.id">
              <div class="d-flex align-center ga-2 mb-2 mt-3">
                <v-icon size="18">{{ cat.icon || 'mdi-tag-outline' }}</v-icon>
                <span class="text-subtitle-2 font-weight-medium">{{ cat.name }}</span>
              </div>
              <v-card
                v-for="svc in servicesByCategory(cat.id)"
                :key="svc.id"
                class="mb-3 rounded-xl service-select-card"
                :class="{
                  'hover-lift': selectedService?.id !== svc.id,
                  'is-selected': selectedService?.id === svc.id,
                }"
                :variant="selectedService?.id === svc.id ? 'flat' : 'outlined'"
                :color="selectedService?.id === svc.id ? 'primary' : undefined"
                @click="selectService(svc)"
              >
                <v-card-text class="d-flex align-center ga-3">
                  <div class="color-dot" :style="{ backgroundColor: svc.color }" />
                  <div class="flex-grow-1">
                    <div class="text-subtitle-1 font-weight-medium">{{ svc.name }}</div>
                    <div v-if="svc.description" class="text-caption text-medium-emphasis">
                      {{ svc.description }}
                    </div>
                    <div class="text-caption text-medium-emphasis">{{ svc.duration_minutes }} min</div>
                  </div>
                  <div class="text-end">
                    <div class="text-subtitle-2 font-weight-bold">{{ formatPrice(svc.price) }}</div>
                    <v-icon v-if="selectedService?.id === svc.id" size="20" class="mt-1">
                      mdi-check-circle
                    </v-icon>
                  </div>
                </v-card-text>
              </v-card>
            </template>
          </div>
        </template>

        <template #item.2>
          <div class="pa-4">
            <h3 class="text-subtitle-1 font-weight-medium mb-4">Selecciona un empleado</h3>
            <v-alert
              color="info"
              variant="tonal"
              class="mb-4"
              icon="mdi-account-check-outline"
            >
              El sistema puede asignar cualquier empleado disponible para este servicio
            </v-alert>
            <v-card
              v-for="employee in employeesForService"
              :key="employee.id"
              class="mb-3 rounded-xl service-select-card"
              :class="{
                'hover-lift': selectedEmployee?.id !== employee.id,
                'is-selected': selectedEmployee?.id === employee.id,
              }"
              :variant="selectedEmployee?.id === employee.id ? 'flat' : 'outlined'"
              :color="selectedEmployee?.id === employee.id ? 'primary' : undefined"
              @click="selectEmployee(employee)"
            >
              <v-card-text class="d-flex align-center ga-3">
                <v-avatar :color="employee.color" size="40">
                  <span class="text-white text-body-2">
                    {{ (employee.first_name || '')[0] }}{{ (employee.last_name || '')[0] }}
                  </span>
                </v-avatar>
                <div class="flex-grow-1 font-weight-medium">
                  {{ employee.first_name }} {{ employee.last_name }}
                </div>
                <v-icon v-if="selectedEmployee?.id === employee.id" size="20">
                  mdi-check-circle
                </v-icon>
              </v-card-text>
            </v-card>
          </div>
        </template>

        <template #item.3>
          <div class="pa-4">
            <h3 class="text-subtitle-1 font-weight-medium mb-4">Selecciona una fecha</h3>
            <v-date-picker v-model="selectedDate" :min="minDate" show-current />
          </div>
        </template>

        <template #item.4>
          <div class="pa-4">
            <h3 class="text-subtitle-1 font-weight-medium mb-4">Selecciona una hora</h3>
            <div v-if="slotsLoading" class="text-center pa-4">
              <v-progress-circular indeterminate color="primary" />
            </div>
            <TimeSlotPicker
              v-else
              v-model="selectedTime"
              :slots="availability.slots.value"
              :date="selectedDate"
              :show-waitlist="true"
              label="Horarios disponibles"
              @join-waitlist="onJoinWaitlist"
            />
          </div>
        </template>

        <template #item.5>
          <div class="pa-4">
            <h3 class="text-subtitle-1 font-weight-medium mb-4">Tus datos</h3>
            <v-form ref="formRef">
              <v-text-field
                v-model="customerName"
                label="Nombre completo *"
                :rules="[rules.required]"
              />
              <v-text-field
                v-model="customerEmail"
                label="Email *"
                type="email"
                :rules="[rules.required, rules.email]"
              />
              <v-text-field
                v-model="customerPhone"
                label="Teléfono *"
                :rules="[rules.required, rules.phone]"
              />
              <v-textarea v-model="customerNotes" label="Notas (opcional)" rows="2" />
            </v-form>
          </div>
        </template>

        <template #item.6>
          <div class="pa-4">
            <h3 class="text-subtitle-1 font-weight-medium mb-4">Confirma tu reserva</h3>
            <v-card variant="outlined" class="rounded-xl overflow-hidden mb-4">
              <div class="d-flex flex-column">
                <div class="pa-4 d-flex align-center ga-3" style="background: rgba(var(--v-theme-primary), 0.06)">
                  <div class="color-dot" :style="{ backgroundColor: selectedService?.color }" />
                  <div class="flex-grow-1">
                    <div class="text-subtitle-1 font-weight-bold">{{ selectedService?.name }}</div>
                    <div class="text-caption text-medium-emphasis">
                      {{ selectedEmployee?.first_name }} {{ selectedEmployee?.last_name }}
                    </div>
                  </div>
                  <div class="text-subtitle-1 font-weight-bold">{{ formatPrice(selectedService?.price ?? 0) }}</div>
                </div>
                <v-divider />
                <div class="pa-4 d-flex flex-column ga-3">
                  <div class="d-flex justify-space-between">
                    <span class="text-body-2 text-medium-emphasis d-flex align-center ga-1">
                      <v-icon size="16">mdi-calendar</v-icon>Fecha
                    </span>
                    <span class="text-body-2 font-weight-medium">{{ formatDate(selectedDate) }}</span>
                  </div>
                  <div class="d-flex justify-space-between">
                    <span class="text-body-2 text-medium-emphasis d-flex align-center ga-1">
                      <v-icon size="16">mdi-clock-outline</v-icon>Hora
                    </span>
                    <span class="text-body-2 font-weight-medium">{{ selectedTime?.slice(0, 5) }}</span>
                  </div>
                  <div class="d-flex justify-space-between">
                    <span class="text-body-2 text-medium-emphasis d-flex align-center ga-1">
                      <v-icon size="16">mdi-timer-outline</v-icon>Duración
                    </span>
                    <span class="text-body-2 font-weight-medium">{{ selectedService?.duration_minutes }} min</span>
                  </div>
                  <v-divider />
                  <div class="d-flex justify-space-between">
                    <span class="text-body-2 text-medium-emphasis d-flex align-center ga-1">
                      <v-icon size="16">mdi-account</v-icon>Nombre
                    </span>
                    <span class="text-body-2 font-weight-medium text-end">{{ customerName }}</span>
                  </div>
                  <div class="d-flex justify-space-between">
                    <span class="text-body-2 text-medium-emphasis d-flex align-center ga-1">
                      <v-icon size="16">mdi-email-outline</v-icon>Email
                    </span>
                    <span class="text-body-2 font-weight-medium text-end">{{ customerEmail }}</span>
                  </div>
                  <div class="d-flex justify-space-between">
                    <span class="text-body-2 text-medium-emphasis d-flex align-center ga-1">
                      <v-icon size="16">mdi-phone-outline</v-icon>Teléfono
                    </span>
                    <span class="text-body-2 font-weight-medium text-end">{{ customerPhone }}</span>
                  </div>
                </div>
              </div>
            </v-card>
          </div>
        </template>

        <template #actions>
          <div class="booking-actions pa-4">
            <v-btn v-if="step > 1" variant="text" @click="goBack">
              <v-icon start>mdi-arrow-left</v-icon>
              Atrás
            </v-btn>
            <v-spacer />
            <v-btn
              v-if="step < 6"
              color="primary"
              variant="flat"
              :disabled="!canProceed"
              @click="step++"
            >
              Siguiente
              <v-icon end>mdi-arrow-right</v-icon>
            </v-btn>
            <v-btn
              v-else
              color="success"
              variant="flat"
              size="large"
              :loading="submitting"
              :disabled="submitting"
              @click="onConfirm"
            >
              <v-icon start>mdi-check</v-icon>
              Confirmar Reserva
            </v-btn>
          </div>
        </template>
      </v-stepper>

      <v-card v-if="confirmed" class="mt-4 pa-8 text-center rounded-xl">
        <v-avatar color="success" size="72" class="mx-auto mb-4">
          <v-icon size="40" color="white">mdi-check</v-icon>
        </v-avatar>
        <h2 class="text-h5 font-weight-bold mb-2">¡Reserva confirmada!</h2>
        <p class="text-body-1 text-medium-emphasis mb-0">
          Recibirás un email de confirmación en <strong>{{ customerEmail }}</strong>.
        </p>
        <div class="d-flex justify-center mt-6">
          <v-btn color="primary" variant="flat" @click="resetForm">
            <v-icon start>mdi-calendar-plus</v-icon>
            Reservar otra cita
          </v-btn>
        </div>
      </v-card>
    </v-container>

    <WaitlistDialog
      :visible="showWaitlistDialog"
      :service-id="selectedService?.id ?? ''"
      :employee-id="selectedEmployee?.id"
      :date="selectedDate"
      @close="showWaitlistDialog = false"
      @save="onWaitlistSave"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useServiceStore } from '../stores/service.store';
import { useEmployeeStore } from '../stores/employee.store';
import { useServiceCategoryStore } from '../stores/service-category.store';
import { useBookingStore } from '../stores/booking.store';
import { useTenantStore } from '@/shared/stores/tenant.store';
import { useAvailability } from '../composables/useAvailability';
import TimeSlotPicker from '../components/TimeSlotPicker.vue';
import WaitlistDialog from '../components/WaitlistDialog.vue';
import type { Service } from '../types/service.types';
import type { Employee } from '../types/employee.types';

const route = useRoute();
const serviceStore = useServiceStore();
const employeeStore = useEmployeeStore();
const categoryStore = useServiceCategoryStore();
const bookingStore = useBookingStore();
const tenantStore = useTenantStore();
const availability = useAvailability();

const step = ref(1);
const loading = ref(false);
const submitting = ref(false);
const confirmed = ref(false);
const bookingError = ref<string | null>(null);
const showWaitlistDialog = ref(false);
const formRef = ref();

const selectedService = ref<Service | null>(null);
const selectedEmployee = ref<Employee | null>(null);
const selectedDate = ref(new Date().toISOString().split('T')[0]);
const selectedTime = ref('');
const customerName = ref('');
const customerEmail = ref('');
const customerPhone = ref('');
const customerNotes = ref('');

const tenant = computed(() => tenantStore.tenant);

const steps = ['Servicio', 'Empleado', 'Fecha', 'Hora', 'Tus datos', 'Confirmar'];

const bookingProgress = computed(() => Math.round(((step.value - 1) / (steps.length - 1)) * 100));

const minDate = new Date().toISOString().split('T')[0];

const categoriesWithServices = computed(() => {
  const catIds = new Set(serviceStore.services.map((s) => s.category_id));
  return categoryStore.categories.filter((c) => catIds.has(c.id));
});

function servicesByCategory(categoryId: string) {
  return serviceStore.services.filter((s) => s.category_id === categoryId);
}

const employeesForService = ref<Employee[]>([]);

const slotsLoading = computed(() => availability.loading.value);

const rules = {
  required: (v: string) => !!v?.trim() || 'Campo requerido',
  email: (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'Email inválido',
  phone: (v: string) => /^\+?[\d\s\-()]{7,15}$/.test(v) || 'Teléfono inválido',
};

const canProceed = computed(() => {
  if (step.value === 1) return !!selectedService.value;
  if (step.value === 2) return !!selectedEmployee.value;
  if (step.value === 3) return !!selectedDate.value;
  if (step.value === 4) return !!selectedTime.value;
  if (step.value === 5) {
    return !!customerName.value?.trim() &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.value) &&
      /^\+?[\d\s\-()]{7,15}$/.test(customerPhone.value);
  }
  return true;
});

onMounted(async () => {
  loading.value = true;
  const slug = route.params.slug as string;
  await tenantStore.fetchTenantBySlug(slug);
  await Promise.all([
    serviceStore.fetchServices(),
    employeeStore.fetchEmployees(),
    categoryStore.fetchCategories(),
  ]);
  loading.value = false;
});

watch(selectedDate, async () => {
  if (selectedService.value && selectedEmployee.value && selectedDate.value && tenantStore.tenant) {
    await availability.fetchSlots(
      tenantStore.tenant.id,
      selectedEmployee.value.id,
      selectedDate.value,
      selectedService.value.duration_minutes,
      selectedService.value.id,
    );
  }
});

async function selectService(service: Service) {
  selectedService.value = service;
  selectedEmployee.value = null;
  selectedTime.value = '';
  const name = service.name;
  employeesForService.value = await employeeStore.getEmployeesByServiceName(name);
  step.value = 2;
}

function selectEmployee(employee: Employee) {
  selectedEmployee.value = employee;
  selectedTime.value = '';
  step.value = 3;
}

function goBack() {
  if (step.value === 4) selectedTime.value = '';
  if (step.value === 5) {
    customerName.value = '';
    customerEmail.value = '';
    customerPhone.value = '';
    customerNotes.value = '';
  }
  step.value--;
}

async function onConfirm() {
  submitting.value = true;
  bookingError.value = null;
  try {
    await bookingStore.createBooking({
      service_id: selectedService.value!.id,
      employee_id: selectedEmployee.value!.id,
      date: selectedDate.value,
      start_time: selectedTime.value,
      customer_name: customerName.value,
      customer_email: customerEmail.value,
      customer_phone: customerPhone.value,
      notes: customerNotes.value || undefined,
      source: 'online',
    });
    confirmed.value = true;
  } catch (e: unknown) {
    bookingError.value = e instanceof Error ? e.message : 'Error al crear la reserva. Intenta de nuevo.';
  } finally {
    submitting.value = false;
  }
}

function resetForm() {
  step.value = 1;
  confirmed.value = false;
  bookingError.value = null;
  selectedService.value = null;
  selectedEmployee.value = null;
  selectedTime.value = '';
  customerName.value = '';
  customerEmail.value = '';
  customerPhone.value = '';
  customerNotes.value = '';
  employeesForService.value = [];
}

function onJoinWaitlist() {
  if (!tenantStore.tenant || !selectedService.value || !selectedEmployee.value) return;
  showWaitlistDialog.value = true;
}

async function onWaitlistSave(data: { customer_name: string; customer_email: string; customer_phone: string; preference: 'exact' | 'flexible' }) {
  if (!tenantStore.tenant || !selectedService.value || !selectedEmployee.value) return;
  try {
    await bookingStore.joinWaitlist({
      service_id: selectedService.value.id,
      employee_id: selectedEmployee.value.id,
      preferred_date: selectedDate.value,
      customer_name: data.customer_name,
      customer_email: data.customer_email,
      customer_phone: data.customer_phone || undefined,
      preference: data.preference,
    });
    showWaitlistDialog.value = false;
    bookingError.value = null;
  } catch (e: unknown) {
    bookingError.value = e instanceof Error ? e.message : 'Error al unirse a la lista de espera.';
  }
}

function formatPrice(centavos: number): string {
  return `$${(centavos / 100).toFixed(2)}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}
</script>

<style scoped>
.color-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.service-select-card {
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
}

.service-select-card.is-selected {
  border: 2px solid rgb(var(--v-theme-primary)) !important;
  background-color: rgba(var(--v-theme-primary), 0.08) !important;
}

.booking-actions {
  position: sticky;
  bottom: 0;
  z-index: 4;
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgb(var(--v-theme-surface));
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
</style>
