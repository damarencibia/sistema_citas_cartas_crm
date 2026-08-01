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
        <div v-if="!confirmed" class="booking-stepper-track mx-auto mt-4">
          <div class="booking-stepper-line">
            <div
              class="booking-stepper-fill"
              :style="{ width: `${progressFraction * 100}%` }"
            />
          </div>
          <div class="booking-stepper-steps">
            <div
              v-for="(label, i) in steps"
              :key="label"
              class="booking-step"
              :class="{
                'is-done': step > i + 1,
                'is-active': step === i + 1,
              }"
            >
              <div class="booking-step-dot">
                <v-icon v-if="step > i + 1" size="14">mdi-check</v-icon>
                <span v-else>{{ i + 1 }}</span>
              </div>
              <span class="booking-step-label">{{ label }}</span>
            </div>
          </div>
        </div>
      </div>

      <v-alert
        v-if="pendingEmployeeName"
        type="info"
        variant="tonal"
        class="mb-4"
        closable
        @click:close="pendingEmployeeId = null"
      >
        Reservando con <strong>{{ pendingEmployeeName }}</strong>.
      </v-alert>

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
            <h3 class="text-subtitle-1 font-weight-medium mb-4">Selecciona una categoría</h3>
            <div v-if="loading" class="text-center pa-4">
              <v-progress-circular indeterminate color="primary" />
            </div>
            <v-row v-else>
              <v-col
                v-for="cat in categoryOptions"
                :key="cat.id"
                cols="12"
                sm="6"
                md="4"
              >
                <v-card
                  class="mb-3 rounded-xl service-select-card h-100"
                  :class="{
                    'hover-lift': selectedCategory !== cat.id,
                    'is-selected': selectedCategory === cat.id,
                  }"
                  :variant="selectedCategory === cat.id ? 'flat' : 'outlined'"
                  :color="selectedCategory === cat.id ? 'primary' : undefined"
                  @click="selectCategory(cat.id)"
                >
                  <v-card-text class="text-center pa-5">
                    <v-avatar
                      :color="`rgba(var(--v-theme-primary), 0.12)`"
                      size="56"
                      class="mx-auto mb-3"
                    >
                      <v-icon size="26" color="primary">{{ cat.icon }}</v-icon>
                    </v-avatar>
                    <div class="text-subtitle-1 font-weight-medium">{{ cat.name }}</div>
                    <div class="text-caption text-medium-emphasis mt-1">
                      {{ cat.serviceCount }}
                      {{ cat.serviceCount === 1 ? 'servicio' : 'servicios' }}
                    </div>
                    <v-icon
                      v-if="selectedCategory === cat.id"
                      size="20"
                      color="primary"
                      class="mt-1"
                    >
                      mdi-check-circle
                    </v-icon>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </div>
        </template>

        <template #item.2>
          <div class="pa-4">
            <div class="d-flex align-center justify-space-between flex-wrap ga-2 mb-4">
              <h3 class="text-subtitle-1 font-weight-medium mb-0">
                Servicios de {{ selectedCategoryName }}
              </h3>
              <v-btn
                variant="text"
                size="small"
                color="primary"
                @click="step = 1"
              >
                <v-icon start size="16">mdi-swap-horizontal</v-icon>
                Cambiar categoría
              </v-btn>
            </div>
            <v-card
              v-for="svc in servicesInCategory"
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
            <v-empty
              v-if="!servicesInCategory.length"
              icon="mdi-spa-off-outline"
              text="No hay servicios disponibles en esta categoría."
            />
          </div>
        </template>

        <template #item.3>
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

        <template #item.4>
          <div class="pa-4">
            <h3 class="text-subtitle-1 font-weight-medium mb-4">Selecciona una fecha</h3>
            <v-date-picker v-model="selectedDate" :min="minDate" show-current />
          </div>
        </template>

        <template #item.5>
          <div class="pa-4">
            <h3 class="text-subtitle-1 font-weight-medium mb-4">Selecciona una hora</h3>
            <div v-if="slotsLoading" class="text-center pa-4">
              <v-progress-circular indeterminate color="primary" />
            </div>
            <TimeSlotPicker
              v-else
              v-model="selectedTime"
              v-model:waitlist-times="waitlistTimes"
              :slots="availability.slots.value"
              :date="selectedDate"
              label="Horarios disponibles"
            />
          </div>
        </template>

        <template #item.6>
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
              <v-checkbox
                v-if="!joiningWaitlist"
                v-model="whatsappConsent"
                color="primary"
                density="compact"
                hide-details
                class="mt-1"
              >
                <template #label>
                  <span class="text-caption">
                    Quiero recibir confirmaciones y recordatorios por WhatsApp
                  </span>
                </template>
              </v-checkbox>
            </v-form>
          </div>
        </template>

        <template #item.7>
          <div class="pa-4">
            <h3 class="text-subtitle-1 font-weight-medium mb-4">Confirma tu reserva</h3>
            <v-alert
              v-if="joiningWaitlist"
              type="info"
              variant="tonal"
              density="compact"
              class="mb-4"
              icon="mdi-clock-outline"
            >
              Te unirás a la lista de espera para:
              <strong>{{ waitlistTimes.map((t) => t.slice(0, 5)).join(', ') }}</strong>.
              Te avisaremos cuando alguno se libere.
            </v-alert>
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
                    <span v-if="!joiningWaitlist" class="text-body-2 font-weight-medium">{{ selectedTime?.slice(0, 5) }}</span>
                    <span v-else class="text-body-2 font-weight-medium text-end">
                      {{ waitlistTimes.map((t) => t.slice(0, 5)).join(', ') }}
                    </span>
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
              v-if="step < 7"
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
              {{ joiningWaitlist ? 'Unirse a Lista de Espera' : 'Confirmar Reserva' }}
            </v-btn>
          </div>
        </template>
      </v-stepper>

      <v-card v-if="confirmed" class="mt-4 pa-8 text-center rounded-xl">
        <v-avatar color="success" size="72" class="mx-auto mb-4">
          <v-icon size="40" color="white">mdi-check</v-icon>
        </v-avatar>
        <h2 v-if="!waitlistJoined" class="text-h5 font-weight-bold mb-2">¡Reserva confirmada!</h2>
        <h2 v-else class="text-h5 font-weight-bold mb-2">¡Estás en la lista de espera!</h2>
        <p v-if="!waitlistJoined" class="text-body-1 text-medium-emphasis mb-0">
          Recibirás un email de confirmación en <strong>{{ customerEmail }}</strong>.
        </p>
        <p v-else class="text-body-1 text-medium-emphasis mb-0">
          Te notificaremos a <strong>{{ customerEmail }}</strong> cuando alguno de tus horarios seleccionados se libere.
        </p>
        <div class="d-flex flex-column align-center mt-6 ga-3">
          <v-btn
            v-if="!waitlistJoined && waSummaryUrl"
            color="green"
            variant="tonal"
            :href="waSummaryUrl"
            target="_blank"
            rel="noopener"
            prepend-icon="mdi-whatsapp"
          >
            Enviar resumen por WhatsApp
          </v-btn>
          <v-btn color="primary" variant="flat" @click="resetForm">
            <v-icon start>mdi-calendar-plus</v-icon>
            Reservar otra cita
          </v-btn>
        </div>
      </v-card>
    </v-container>
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
const formRef = ref();

const selectedCategory = ref<string | null>(null);
const selectedService = ref<Service | null>(null);
const selectedEmployee = ref<Employee | null>(null);
const selectedDate = ref(new Date().toISOString().split('T')[0]);
const selectedTime = ref('');
const waitlistTimes = ref<string[]>([]);
const waitlistJoined = ref(false);
const pendingEmployeeId = ref<string | null>(null);
const customerName = ref('');
const customerEmail = ref('');
const customerPhone = ref('');
const customerNotes = ref('');
const whatsappConsent = ref(false);

const tenant = computed(() => tenantStore.tenant);

const pendingEmployeeName = computed(() => {
  if (!pendingEmployeeId.value) return '';
  return employeeStore.activeEmployees.find((e) => e.id === pendingEmployeeId.value)?.first_name ?? '';
});

const waSummaryUrl = computed(() => {
  const digits = (selectedEmployee.value?.phone || '').replace(/\D/g, '');
  if (!digits) return '';
  const workerName = selectedEmployee.value
    ? `${selectedEmployee.value.first_name} ${selectedEmployee.value.last_name}`.trim()
    : '';
  const text = [
    `Hola ${workerName}, confirmo mi cita`,
    selectedService.value?.name ? ` de ${selectedService.value.name}` : '',
    selectedDate.value ? ` el ${formatDate(selectedDate.value)}` : '',
    selectedTime.value ? ` a las ${selectedTime.value.slice(0, 5)}` : '',
    customerName.value ? `. Soy ${customerName.value}` : '.',
  ].join('');
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
});

const steps = ['Categoría', 'Servicio', 'Empleado', 'Fecha', 'Hora', 'Tus datos', 'Confirmar'];

const progressFraction = computed(() => {
  if (steps.length <= 1) return 0;
  return (step.value - 1) / (steps.length - 1);
});

const minDate = new Date().toISOString().split('T')[0];

const activeServices = computed(() => serviceStore.services.filter((s) => s.is_active));

const categoryOptions = computed(() => {
  const map = new Map<
    string,
    { id: string; name: string; icon: string; description: string | null; serviceCount: number }
  >();
  for (const svc of activeServices.value) {
    const cat = categoryStore.categories.find((c) => c.id === svc.category_id);
    const key = cat ? cat.id : '__general__';
    if (!map.has(key)) {
      map.set(key, {
        id: key,
        name: cat?.name ?? 'General',
        icon: cat?.icon ?? 'mdi-tag-outline',
        description: cat?.description ?? null,
        serviceCount: 0,
      });
    }
    map.get(key)!.serviceCount++;
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
});

const selectedCategoryName = computed(
  () => categoryOptions.value.find((c) => c.id === selectedCategory.value)?.name ?? '',
);

const servicesInCategory = computed(() => {
  if (!selectedCategory.value) return [];
  return activeServices.value.filter((svc) => {
    const cat = categoryStore.categories.find((c) => c.id === svc.category_id);
    return (cat ? cat.id : '__general__') === selectedCategory.value;
  });
});

const employeesForService = ref<Employee[]>([]);

const slotsLoading = computed(() => availability.loading.value);

const joiningWaitlist = computed(() => waitlistTimes.value.length > 0);

const rules = {
  required: (v: string) => !!v?.trim() || 'Campo requerido',
  email: (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'Email inválido',
  phone: (v: string) => /^\+?[\d\s\-()]{7,15}$/.test(v) || 'Teléfono inválido',
};

const canProceed = computed(() => {
  if (step.value === 1) return !!selectedCategory.value;
  if (step.value === 2) return !!selectedService.value;
  if (step.value === 3) return !!selectedEmployee.value;
  if (step.value === 4) return !!selectedDate.value;
  if (step.value === 5) return !!selectedTime.value || waitlistTimes.value.length > 0;
  if (step.value === 6) {
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
  const qEmpId = route.query.employee_id;
  if (typeof qEmpId === 'string') {
    const emp = employeeStore.activeEmployees.find((e) => e.id === qEmpId);
    if (emp) pendingEmployeeId.value = emp.id;
  }
  loading.value = false;
});

watch(selectedDate, async () => {
  selectedTime.value = '';
  waitlistTimes.value = [];
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

function selectCategory(categoryId: string) {
  if (selectedCategory.value === categoryId) return;
  selectedCategory.value = categoryId;
  selectedService.value = null;
  selectedEmployee.value = null;
  selectedTime.value = '';
  waitlistTimes.value = [];
}

async function selectService(service: Service) {
  selectedService.value = service;
  selectedEmployee.value = null;
  selectedTime.value = '';
  waitlistTimes.value = [];
  const name = service.name;
  employeesForService.value = await employeeStore.getEmployeesByServiceName(name);
  if (pendingEmployeeId.value) {
    const pending = employeesForService.value.find((e) => e.id === pendingEmployeeId.value);
    pendingEmployeeId.value = null;
    if (pending) {
      selectedEmployee.value = pending;
      step.value = 4;
      return;
    }
  }
  step.value = 3;
}

function selectEmployee(employee: Employee) {
  selectedEmployee.value = employee;
  selectedTime.value = '';
  waitlistTimes.value = [];
  step.value = 4;
}

function goBack() {
  if (step.value === 5) {
    selectedTime.value = '';
    waitlistTimes.value = [];
  }
  if (step.value === 6) {
    customerName.value = '';
    customerEmail.value = '';
    customerPhone.value = '';
    customerNotes.value = '';
    whatsappConsent.value = false;
  }
  step.value--;
}

async function onConfirm() {
  submitting.value = true;
  bookingError.value = null;
  const waWindow = waSummaryUrl.value ? window.open('', '_blank') : null;
  try {
    if (joiningWaitlist.value) {
      await bookingStore.joinWaitlist({
        service_id: selectedService.value!.id,
        employee_id: selectedEmployee.value!.id,
        preferred_date: selectedDate.value,
        preferred_times: waitlistTimes.value,
        preferred_time_start: waitlistTimes.value[0],
        customer_name: customerName.value,
        customer_email: customerEmail.value,
        customer_phone: customerPhone.value,
        preference: 'exact',
      });
      waitlistJoined.value = true;
      confirmed.value = true;
      return;
    }
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
      whatsapp_consent: whatsappConsent.value,
    });
    confirmed.value = true;
    if (waWindow && waSummaryUrl.value) {
      waWindow.location.href = waSummaryUrl.value;
    }
  } catch (e: unknown) {
    bookingError.value = e instanceof Error ? e.message : 'Error al procesar tu solicitud. Intenta de nuevo.';
    if (waWindow) waWindow.close();
  } finally {
    submitting.value = false;
  }
}

function resetForm() {
  step.value = 1;
  confirmed.value = false;
  waitlistJoined.value = false;
  bookingError.value = null;
  selectedCategory.value = null;
  selectedService.value = null;
  selectedEmployee.value = null;
  selectedTime.value = '';
  waitlistTimes.value = [];
  customerName.value = '';
  customerEmail.value = '';
  customerPhone.value = '';
  customerNotes.value = '';
  whatsappConsent.value = false;
  employeesForService.value = [];
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
:deep(.v-stepper-header) {
  display: none;
}

.booking-stepper-track {
  position: relative;
  max-width: 640px;
  padding: 0 12px;
  margin-bottom: 24px;
}

.booking-stepper-line {
  position: absolute;
  top: 15px;
  left: calc(100% / 7 / 2);
  right: calc(100% / 7 / 2);
  height: 3px;
  border-radius: 99px;
  background: rgba(var(--v-theme-primary), 0.16);
  overflow: hidden;
}

.booking-stepper-fill {
  height: 100%;
  border-radius: 99px;
  background: rgb(var(--v-theme-primary));
  transition: width 0.45s cubic-bezier(0.22, 1, 0.36, 1);
}

.booking-stepper-steps {
  display: flex;
  position: relative;
  z-index: 1;
}

.booking-step {
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.booking-step-dot {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  color: rgb(var(--v-theme-primary));
  background: rgb(var(--v-theme-surface));
  border: 2px solid rgba(var(--v-theme-primary), 0.4);
  transition: all 0.3s ease;
}

.booking-step-label {
  font-size: 11px;
  line-height: 1.2;
  text-align: center;
  color: rgb(var(--v-theme-on-surface), 0.6);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.booking-step.is-done .booking-step-dot,
.booking-step.is-active .booking-step-dot {
  background: rgb(var(--v-theme-primary));
  border-color: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
}

.booking-step.is-active .booking-step-dot {
  transform: scale(1.18);
  animation: bookingDotPulse 1.6s ease-out infinite;
}

.booking-step.is-active .booking-step-label {
  color: rgb(var(--v-theme-primary));
  font-weight: 600;
}

@keyframes bookingDotPulse {
  0% { box-shadow: 0 0 0 0 rgba(var(--v-theme-primary), 0.35); }
  70% { box-shadow: 0 0 0 9px rgba(var(--v-theme-primary), 0); }
  100% { box-shadow: 0 0 0 0 rgba(var(--v-theme-primary), 0); }
}

@media (max-width: 600px) {
  .booking-stepper-track {
    max-width: 420px;
  }

  .booking-step-label {
    display: none;
  }

  .booking-step-dot {
    width: 26px;
    height: 26px;
    font-size: 12px;
  }

  .booking-stepper-line {
    top: 13px;
  }
}

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
