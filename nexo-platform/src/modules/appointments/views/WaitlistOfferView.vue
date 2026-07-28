<template>
  <div class="public-layout">
    <v-container class="py-8" max-width="520">
      <div v-if="loading" class="text-center pa-8">
        <v-progress-circular indeterminate color="primary" size="48" />
        <p class="text-body-2 text-medium-emphasis mt-4">Verificando disponibilidad...</p>
      </div>

      <template v-else-if="error">
        <div class="text-center pa-8">
          <v-icon size="64" color="error">mdi-alert-circle-outline</v-icon>
          <h2 class="text-h6 font-weight-bold mt-4">Oferta no disponible</h2>
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

      <template v-else-if="decined">
        <div class="text-center pa-8">
          <v-icon size="64" color="info">mdi-check-circle-outline</v-icon>
          <h2 class="text-h6 font-weight-bold mt-4">Oferta rechazada</h2>
          <p class="text-body-2 text-medium-emphasis mt-2">
            Has rechazado esta oferta. La siguiente persona en la fila será notificada.
          </p>
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

      <template v-else-if="accepted">
        <div class="text-center pa-8">
          <v-icon size="64" color="success">mdi-check-circle-outline</v-icon>
          <h2 class="text-h6 font-weight-bold mt-4">¡Reserva confirmada!</h2>
          <p class="text-body-2 text-medium-emphasis mt-2">
            Tu cita ha sido reservada exitosamente. Recibirás un email de confirmación.
          </p>
          <v-card v-if="entry" variant="outlined" class="mt-4 pa-4">
            <div class="d-flex flex-column ga-2">
              <div class="d-flex justify-space-between">
                <span class="text-body-2 text-medium-emphasis">Servicio</span>
                <span class="text-body-2 font-weight-medium">{{ entry.service?.name }}</span>
              </div>
              <v-divider />
              <div class="d-flex justify-space-between">
                <span class="text-body-2 text-medium-emphasis">Fecha</span>
                <span class="text-body-2 font-weight-medium">{{ formatDate(entry.offered_slot_date!) }}</span>
              </div>
              <v-divider />
              <div class="d-flex justify-space-between">
                <span class="text-body-2 text-medium-emphasis">Hora</span>
                <span class="text-body-2 font-weight-medium">{{ entry.offered_slot_time?.slice(0, 5) }}</span>
              </div>
            </div>
          </v-card>
          <v-btn
            color="primary"
            variant="flat"
            class="mt-6"
            @click="goToBooking"
          >
            Reservar otra cita
          </v-btn>
        </div>
      </template>

      <template v-else-if="entry">
        <div class="text-center mb-6">
          <v-icon size="48" color="primary">mdi-clock-alert-outline</v-icon>
          <h1 class="text-h5 font-weight-bold mt-2">Espacio disponible</h1>
          <p class="text-body-2 text-medium-emphasis mt-1">
            Tienes un tiempo limitado para confirmar
          </p>
        </div>

        <v-card variant="outlined" class="mb-4">
          <v-card-text class="pa-5">
            <div class="d-flex flex-column ga-3">
              <div class="d-flex justify-space-between align-center">
                <span class="text-body-2 text-medium-emphasis">Servicio</span>
                <div class="text-right">
                  <span class="text-body-2 font-weight-medium">{{ entry.service?.name }}</span>
                  <span class="text-caption text-medium-emphasis d-block">{{ entry.service?.duration_minutes }} min</span>
                </div>
              </div>
              <v-divider />
              <div class="d-flex justify-space-between align-center">
                <span class="text-body-2 text-medium-emphasis">Profesional</span>
                <span v-if="entry.employee" class="text-body-2 font-weight-medium">
                  {{ entry.employee.first_name }} {{ entry.employee.last_name }}
                </span>
                <span v-else class="text-body-2 text-medium-emphasis">Cualquier disponible</span>
              </div>
              <v-divider />
              <div class="d-flex justify-space-between align-center">
                <span class="text-body-2 text-medium-emphasis">Fecha</span>
                <span class="text-body-2 font-weight-medium">{{ formatDate(entry.offered_slot_date!) }}</span>
              </div>
              <v-divider />
              <div class="d-flex justify-space-between align-center">
                <span class="text-body-2 text-medium-emphasis">Hora</span>
                <span class="text-body-2 font-weight-medium">{{ entry.offered_slot_time?.slice(0, 5) }}</span>
              </div>
              <v-divider />
              <div class="d-flex justify-space-between align-center">
                <span class="text-body-2 text-medium-emphasis">Nombre</span>
                <span class="text-body-2 font-weight-medium">{{ entry.customer_name }}</span>
              </div>
            </div>
          </v-card-text>
        </v-card>

        <v-card
          variant="tonal"
          :color="urgencyColor"
          class="mb-6 text-center pa-4"
        >
          <div class="text-h4 font-weight-bold">
            {{ minutesLeft }}:{{ secondsLeft.toString().padStart(2, '0') }}
          </div>
          <div class="text-body-2">minutos restantes para confirmar</div>
        </v-card>

        <v-btn
          block
          color="success"
          size="large"
          variant="flat"
          :loading="processing"
          :disabled="processing || expired"
          class="mb-3"
          @click="onAccept"
        >
          Reservar ahora
        </v-btn>
        <v-btn
          block
          color="grey"
          size="large"
          variant="outlined"
          :disabled="processing || expired"
          @click="onDecline"
        >
          No me interesa
        </v-btn>
      </template>
    </v-container>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useBookingStore } from '../stores/booking.store';
import { useTenantStore } from '@/shared/stores/tenant.store';
import type { WaitlistEntry } from '../types/booking.types';

const route = useRoute();
const router = useRouter();
const bookingStore = useBookingStore();
const tenantStore = useTenantStore();

const loading = ref(true);
const processing = ref(false);
const error = ref<string | null>(null);
const entry = ref<WaitlistEntry | null>(null);
const accepted = ref(false);
const decined = ref(false);
const expired = ref(false);
const remainingSeconds = ref(0);

let countdownTimer: ReturnType<typeof setInterval> | null = null;

const minutesLeft = computed(() => Math.floor(remainingSeconds.value / 60));
const secondsLeft = computed(() => remainingSeconds.value % 60);

const urgencyColor = computed(() => {
  if (remainingSeconds.value <= 60) return 'error';
  if (remainingSeconds.value <= 300) return 'warning';
  return 'info';
});

onMounted(async () => {
  const slug = route.params.slug as string;
  const token = route.params.token as string;
  const isDecline = route.name === 'waitlist-decline';

  await tenantStore.fetchTenantBySlug(slug);

  const found = await bookingStore.getWaitlistEntryByToken(token);
  if (!found) {
    error.value = 'Esta oferta no existe o ya fue procesada.';
    loading.value = false;
    return;
  }

  if (found.status === 'converted') {
    entry.value = found;
    accepted.value = true;
    loading.value = false;
    return;
  }

  if (found.status !== 'notified' || !found.offer_expires_at) {
    error.value = getInactiveMessage(found.status);
    loading.value = false;
    return;
  }

  const expiresAt = new Date(found.offer_expires_at).getTime();
  const now = Date.now();
  if (expiresAt <= now) {
    error.value = 'Esta oferta ha expirado.';
    expired.value = true;
    loading.value = false;
    return;
  }

  entry.value = found;

  if (isDecline) {
    loading.value = false;
    await onDecline();
    return;
  }

  remainingSeconds.value = Math.floor((expiresAt - now) / 1000);
  loading.value = false;

  countdownTimer = setInterval(() => {
    remainingSeconds.value--;
    if (remainingSeconds.value <= 0) {
      expired.value = true;
      error.value = 'Esta oferta ha expirado.';
      if (countdownTimer) clearInterval(countdownTimer);
    }
  }, 1000);
});

onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer);
});

function getInactiveMessage(status: string): string {
  const messages: Record<string, string> = {
    waiting: 'Esta oferta aún no está activa.',
    expired: 'Esta oferta ha expirado y ya no está disponible.',
    cancelled: 'Esta oferta fue cancelada.',
    converted: 'Esta oferta ya fue canjeada.',
  };
  return messages[status] ?? 'Esta oferta no está disponible.';
}

async function onAccept() {
  if (!entry.value?.offer_token || processing.value) return;
  processing.value = true;
  try {
    const result = await bookingStore.acceptWaitlistOffer(entry.value.offer_token);
    if (result.error) {
      error.value = result.error;
    } else {
      accepted.value = true;
    }
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Error al procesar la reserva.';
  } finally {
    processing.value = false;
  }
}

async function onDecline() {
  if (!entry.value?.offer_token || processing.value) return;
  processing.value = true;
  try {
    await bookingStore.declineWaitlistOffer(entry.value.offer_token);
    decined.value = true;
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Error al procesar.';
  } finally {
    processing.value = false;
  }
}

function goToBooking() {
  const slug = route.params.slug as string;
  router.push({ name: 'public-booking', params: { slug } });
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}
</script>

<style scoped>
.public-layout {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}
</style>
