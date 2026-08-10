<template>
  <div class="public-layout">
    <v-container class="py-8" max-width="640">
      <div v-if="loading" class="text-center pa-8">
        <v-progress-circular indeterminate color="primary" size="48" />
        <p class="text-body-2 text-medium-emphasis mt-4">Consultando tus reservas...</p>
      </div>

      <template v-else-if="error">
        <div class="text-center pa-8">
          <v-icon size="64" color="error">mdi-link-off</v-icon>
          <h2 class="text-h6 font-weight-bold mt-4">Enlace no válido</h2>
          <p class="text-body-2 text-medium-emphasis mt-2">{{ error }}</p>
          <v-btn
            color="primary"
            variant="flat"
            class="mt-6"
            @click="goToBooking"
          >
            Reservar una cita
          </v-btn>
        </div>
      </template>

      <template v-else>
        <div class="text-center mb-6">
          <v-icon size="48" color="primary">mdi-calendar-clock</v-icon>
          <h1 class="text-h5 font-weight-bold mt-2">Mis reservas</h1>
          <p v-if="tenant" class="text-body-2 text-medium-emphasis mt-1">{{ tenant.name }}</p>
        </div>

        <div v-if="bookings.length" class="d-flex justify-end mb-2">
          <v-btn
            size="small"
            variant="tonal"
            color="primary"
            prepend-icon="mdi-refresh"
            :loading="refreshing"
            @click="refresh"
          >
            Actualizar estado
          </v-btn>
        </div>

        <div v-if="bookings.length" class="d-flex flex-column ga-4">
          <v-card v-for="b in bookings" :key="b.booking_id" variant="outlined">
            <v-card-text class="pa-4">
              <div class="d-flex justify-space-between align-start ga-2 mb-3">
                <span class="text-subtitle-1 font-weight-bold">{{ b.service_name }}</span>
                <v-chip
                  :color="statusColor(b.status)"
                  variant="tonal"
                  size="small"
                  class="shrink-0"
                >
                  {{ statusLabel(b.status) }}
                </v-chip>
              </div>
              <div class="d-flex flex-column ga-2">
                <div
                  v-if="b.employee_name"
                  class="d-flex align-center text-body-2 text-medium-emphasis"
                >
                  <v-icon size="18" start>mdi-account-tie</v-icon>
                  {{ b.employee_name }}
                </div>
                <div class="d-flex align-center text-body-2 text-medium-emphasis">
                  <v-icon size="18" start>mdi-calendar</v-icon>
                  {{ formatDate(b.date) }}
                </div>
                <div class="d-flex align-center text-body-2 text-medium-emphasis">
                  <v-icon size="18" start>mdi-clock-outline</v-icon>
                  {{ formatTime(b.start_time) }} – {{ formatTime(b.end_time) }}
                </div>
              </div>
            </v-card-text>
          </v-card>
        </div>

        <v-alert
          v-else
          type="info"
          variant="tonal"
          class="mt-4"
        >
          Aún no tienes reservas registradas con este negocio.
        </v-alert>

        <div class="d-flex flex-column align-center mt-6 ga-3">
          <v-btn
            color="primary"
            variant="flat"
            prepend-icon="mdi-calendar-plus"
            @click="goToBooking"
          >
            Reservar otra cita
          </v-btn>
        </div>
      </template>
    </v-container>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useBookingStore } from '../stores/booking.store';
import { useTenantStore } from '@/shared/stores/tenant.store';
import type { CustomerBookingSummary, BookingStatus } from '../types/booking.types';

const route = useRoute();
const router = useRouter();
const bookingStore = useBookingStore();
const tenantStore = useTenantStore();

const loading = ref(true);
const refreshing = ref(false);
const error = ref<string | null>(null);
const bookings = ref<CustomerBookingSummary[]>([]);

const tenant = computed(() => tenantStore.tenant);

const STATUS_LABELS: Record<BookingStatus, string> = {
  pending_approval: 'Pendiente de aprobación',
  pending_confirmation: 'Pendiente de confirmación',
  confirmed: 'Confirmada',
  in_progress: 'En curso',
  completed: 'Completada',
  cancelled: 'Cancelada',
  no_show: 'No asistió',
};

const STATUS_COLORS: Record<BookingStatus, string> = {
  pending_approval: 'warning',
  pending_confirmation: 'warning',
  confirmed: 'success',
  in_progress: 'info',
  completed: 'success',
  cancelled: 'error',
  no_show: 'error',
};

function statusLabel(status: string): string {
  return STATUS_LABELS[status as BookingStatus] ?? status;
}

function statusColor(status: string): string {
  return STATUS_COLORS[status as BookingStatus] ?? 'default';
}

async function load() {
  const token = route.params.token as string;
  try {
    bookings.value = await bookingStore.fetchCustomerBookings(token);
    error.value = null;
  } catch {
    error.value = 'Este enlace no es válido o ya no está activo.';
  }
}

async function refresh() {
  refreshing.value = true;
  try {
    await load();
  } finally {
    refreshing.value = false;
  }
}

onMounted(async () => {
  const slug = route.params.slug as string;
  await tenantStore.fetchTenantBySlug(slug);
  const token = route.params.token as string;
  if (!token) {
    error.value = 'Enlace inválido.';
    loading.value = false;
    return;
  }
  await load();
  loading.value = false;
});

function goToBooking() {
  const slug = route.params.slug as string;
  router.push({ name: 'public-booking', params: { slug } });
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatTime(time: string): string {
  return time.slice(0, 5);
}
</script>

<style scoped>
.public-layout {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}
</style>
