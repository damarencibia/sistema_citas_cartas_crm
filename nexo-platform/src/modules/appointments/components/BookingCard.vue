<template>
  <v-card class="booking-card mb-2" :style="{ borderLeftColor: booking.employee?.color ?? '#1976D2' }">
    <v-card-text class="d-flex align-center ga-3 py-3">
      <div class="booking-time text-body-2 font-weight-medium text-center">
        <div>{{ booking.start_time?.slice(0, 5) }}</div>
        <div class="text-caption text-medium-emphasis">{{ booking.end_time?.slice(0, 5) }}</div>
      </div>
      <v-divider vertical />
      <div class="booking-info flex-grow-1">
        <div class="text-subtitle-2 text-truncate">{{ booking.customer_name || 'Sin nombre' }}</div>
        <div class="text-caption text-medium-emphasis text-truncate">
          {{ booking.service?.name || 'Servicio' }}
          <template v-if="booking.employee">
            &middot; {{ booking.employee.first_name }} {{ booking.employee.last_name }}
          </template>
        </div>
      </div>
      <BookingStatusChip v-if="!compact" :status="booking.status" />
      <v-btn
        icon="mdi-information-outline"
        size="small"
        variant="text"
        @click.stop="emit('detail', booking)"
      />
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import BookingStatusChip from './BookingStatusChip.vue';
import type { Booking } from '../types/booking.types';

defineProps<{
  booking: Booking;
  compact?: boolean;
}>();

const emit = defineEmits<{
  detail: [booking: Booking];
}>();
</script>

<style scoped>
.booking-card {
  border-left: 4px solid #1976D2;
}
.booking-time {
  min-width: 50px;
  flex-shrink: 0;
}
.booking-info {
  min-width: 0;
}
</style>
