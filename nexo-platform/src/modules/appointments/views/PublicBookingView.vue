<!-- eslint-disable vue/valid-v-slot -->
<template>
  <div class="public-layout">
    <v-container class="py-8" max-width="800">
      <div class="text-center mb-6">
        <h1 class="text-h4 font-weight-bold">Reserva tu Cita</h1>
        <p class="text-body-1 text-medium-emphasis">Selecciona el servicio, empleado y horario</p>
      </div>

      <v-stepper v-model="step" :items="steps" alt-labels>
        <template #item.1>
          <div class="pa-4">
            <h3 class="text-subtitle-1 font-weight-medium mb-4">Selecciona un servicio</h3>
            <div v-if="loading" class="text-center pa-4">
              <v-progress-circular indeterminate color="primary" />
            </div>
            <v-card
              v-for="service in services"
              :key="service.id"
              class="mb-2"
              :color="selectedService?.id === service.id ? 'primary' : undefined"
              :variant="selectedService?.id === service.id ? 'flat' : 'outlined'"
              @click="selectService(service)"
            >
              <v-card-text class="d-flex align-center ga-3">
                <div class="color-dot" :style="{ backgroundColor: service.color }" />
                <div class="flex-grow-1">
                  <div class="text-subtitle-1">{{ service.name }}</div>
                  <div class="text-caption">{{ service.duration_minutes }} min</div>
                </div>
                <div class="text-subtitle-2">{{ formatPrice(service.price) }}</div>
              </v-card-text>
            </v-card>
          </div>
        </template>

        <template #item.2>
          <div class="pa-4">
            <h3 class="text-subtitle-1 font-weight-medium mb-4">Selecciona un empleado</h3>
            <v-card
              v-for="employee in employeesForService"
              :key="employee.id"
              class="mb-2"
              :color="selectedEmployee?.id === employee.id ? 'primary' : undefined"
              :variant="selectedEmployee?.id === employee.id ? 'flat' : 'outlined'"
              @click="selectEmployee(employee)"
            >
              <v-card-text class="d-flex align-center ga-3">
                <v-avatar :color="employee.color" size="40">
                  <span class="text-white text-body-2">
                    {{ employee.first_name[0] }}{{ employee.last_name[0] }}
                  </span>
                </v-avatar>
                <div>{{ employee.first_name }} {{ employee.last_name }}</div>
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
              label="Horarios disponibles"
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
                :rules="[(v) => !!v || 'Requerido']"
                class="mb-2"
              />
              <v-text-field
                v-model="customerEmail"
                label="Email *"
                type="email"
                :rules="[(v) => !!v || 'Requerido']"
                class="mb-2"
              />
              <v-text-field
                v-model="customerPhone"
                label="Teléfono *"
                :rules="[(v) => !!v || 'Requerido']"
                class="mb-2"
              />
              <v-textarea v-model="customerNotes" label="Notas (opcional)" rows="2" />
            </v-form>
          </div>
        </template>

        <template #actions>
          <div class="d-flex justify-space-between pa-4">
            <v-btn v-if="step > 1" variant="text" @click="step--">Atrás</v-btn>
            <v-spacer />
            <v-btn
              v-if="step < 5"
              color="primary"
              variant="flat"
              :disabled="!canProceed"
              @click="step++"
            >
              Siguiente
            </v-btn>
            <v-btn
              v-else
              color="success"
              variant="flat"
              :loading="submitting"
              :disabled="!customerName || !customerEmail || !customerPhone"
              @click="onConfirm"
            >
              Confirmar Reserva
            </v-btn>
          </div>
        </template>
      </v-stepper>

      <v-alert v-if="confirmed" type="success" class="mt-4">
        ¡Reserva confirmada! Recibirás un email de confirmación.
      </v-alert>
    </v-container>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useServiceStore } from '../stores/service.store';
import { useEmployeeStore } from '../stores/employee.store';
import { useBookingStore } from '../stores/booking.store';
import { useTenantStore } from '@/shared/stores/tenant.store';
import { useAvailability } from '../composables/useAvailability';
import TimeSlotPicker from '../components/TimeSlotPicker.vue';
import type { Service } from '../types/service.types';
import type { Employee } from '../types/employee.types';

const route = useRoute();
const serviceStore = useServiceStore();
const employeeStore = useEmployeeStore();
const bookingStore = useBookingStore();
const tenantStore = useTenantStore();
const availability = useAvailability();

const step = ref(1);
const loading = ref(false);
const submitting = ref(false);
const confirmed = ref(false);
const formRef = ref();

const selectedService = ref<Service | null>(null);
const selectedEmployee = ref<Employee | null>(null);
const selectedDate = ref(new Date().toISOString().split('T')[0]);
const selectedTime = ref('');
const customerName = ref('');
const customerEmail = ref('');
const customerPhone = ref('');
const customerNotes = ref('');

const steps = ['Servicio', 'Empleado', 'Fecha', 'Hora', 'Tus datos'];

const minDate = new Date().toISOString().split('T')[0];

const services = computed(() => serviceStore.activeServices);

const employeesForService = ref<Employee[]>([]);

const slotsLoading = computed(() => availability.loading.value);

const canProceed = computed(() => {
  if (step.value === 1) return !!selectedService.value;
  if (step.value === 2) return !!selectedEmployee.value;
  if (step.value === 3) return !!selectedDate.value;
  if (step.value === 4) return !!selectedTime.value;
  return true;
});

onMounted(async () => {
  loading.value = true;
  const slug = route.params.slug as string;
  await tenantStore.fetchTenantBySlug(slug);
  await Promise.all([serviceStore.fetchServices(), employeeStore.fetchEmployees()]);
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
  employeesForService.value = await employeeStore.getEmployeesByService(service.id);
  step.value = 2;
}

function selectEmployee(employee: Employee) {
  selectedEmployee.value = employee;
  step.value = 3;
}

async function onConfirm() {
  submitting.value = true;
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
  } catch {
    // Error handled by store
  } finally {
    submitting.value = false;
  }
}

function formatPrice(centavos: number): string {
  return `$${(centavos / 100).toFixed(2)}`;
}
</script>

<style scoped>
.color-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}
</style>
