<template>
  <div>
    <div v-if="bookings.length === 0" class="text-center pa-8">
      <v-icon size="64" color="medium-emphasis">mdi-check-decagram</v-icon>
      <p class="text-body-1 text-medium-emphasis mt-4">No hay reservas pendientes de aprobación</p>
    </div>

    <v-card
      v-for="booking in bookings"
      :key="booking.id"
      class="mb-3"
      variant="outlined"
    >
      <v-card-text class="py-3">
        <div class="d-flex align-center ga-3 mb-2">
          <BookingStatusChip :status="booking.status" />
          <span class="text-caption text-medium-emphasis">
            {{ booking.date }} {{ booking.start_time?.slice(0, 5) }} - {{ booking.end_time?.slice(0, 5) }}
          </span>
        </div>

        <div class="text-subtitle-2 mb-1">
          {{ booking.customer_name || 'Sin nombre' }}
        </div>
        <div class="text-caption text-medium-emphasis mb-1">
          {{ booking.service?.name || 'Servicio' }}
          <template v-if="booking.employee">
            &middot; {{ booking.employee.first_name }} {{ booking.employee.last_name }}
          </template>
        </div>
        <div v-if="booking.customer_email" class="text-caption text-medium-emphasis mb-1">
          <v-icon size="14" class="mr-1">mdi-email-outline</v-icon>
          {{ booking.customer_email }}
        </div>
        <div v-if="booking.customer_phone" class="text-caption text-medium-emphasis mb-3">
          <v-icon size="14" class="mr-1">mdi-phone-outline</v-icon>
          {{ booking.customer_phone }}
        </div>

        <div class="d-flex ga-2">
          <v-btn
            color="success"
            variant="flat"
            size="small"
            prepend-icon="mdi-check"
            @click="onApprove(booking)"
          >
            Aprobar
          </v-btn>
          <v-btn
            color="error"
            variant="outlined"
            size="small"
            prepend-icon="mdi-close"
            @click="openRejectDialog(booking)"
          >
            Rechazar
          </v-btn>
        </div>
      </v-card-text>
    </v-card>

    <v-dialog v-model="rejectDialog" max-width="420">
      <v-card>
        <v-card-title class="text-h6">Rechazar Reserva</v-card-title>
        <v-card-text>
          <p class="text-body-2 mb-3">
            ¿Rechazar la reserva de <strong>{{ rejectBooking?.customer_name }}</strong>?
          </p>
          <v-textarea
            v-model="rejectReason"
            label="Motivo (opcional)"
            rows="2"
            density="compact"
            hide-details
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="rejectDialog = false">Cancelar</v-btn>
          <v-btn
            color="error"
            variant="flat"
            :loading="rejecting"
            @click="onReject"
          >
            Rechazar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import BookingStatusChip from './BookingStatusChip.vue';
import type { Booking } from '../types/booking.types';

defineProps<{
  bookings: Booking[];
}>();

const emit = defineEmits<{
  approve: [booking: Booking];
  reject: [booking: Booking, reason: string];
}>();

const rejectDialog = ref(false);
const rejectBooking = ref<Booking | null>(null);
const rejectReason = ref('');
const rejecting = ref(false);

function onApprove(booking: Booking) {
  emit('approve', booking);
}

function openRejectDialog(booking: Booking) {
  rejectBooking.value = booking;
  rejectReason.value = '';
  rejectDialog.value = true;
}

function onReject() {
  if (!rejectBooking.value) return;
  rejecting.value = true;
  emit('reject', rejectBooking.value, rejectReason.value);
  rejectDialog.value = false;
  rejecting.value = false;
}
</script>
