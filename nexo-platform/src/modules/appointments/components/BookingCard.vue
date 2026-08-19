<template>
  <v-card
    class="booking-card mb-2"
    :style="{ borderLeftColor: booking.employee?.color ?? '#1976D2' }"
    @click="emit('detail', booking)"
  >
    <v-card-text class="d-flex align-center ga-3 py-3 booking-body">
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
      <BookingStatusChip v-if="!compact" :status="booking.status" :size="xs ? 'x-small' : 'small'" />
    </v-card-text>

    <v-divider v-if="waitlistCount" />

    <div
      v-if="waitlistCount"
      class="booking-card__waitlist px-3 py-1"
      :title="'Ver quién está en cola para este turno'"
    >
      <v-icon size="small" class="mr-1">mdi-account-clock-outline</v-icon>
      <span class="text-caption font-weight-medium">{{ waitlistCount }} en cola</span>
    </div>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import BookingStatusChip from './BookingStatusChip.vue';
import type { Booking, WaitlistEntry } from '../types/booking.types';
import { useDisplay } from 'vuetify';

const { xs } = useDisplay();

const props = defineProps<{
  booking: Booking;
  compact?: boolean;
  waitlistEntries?: WaitlistEntry[];
}>();

const waitlistCount = computed(() => props.waitlistEntries?.length ?? 0);

const emit = defineEmits<{
  detail: [booking: Booking];
}>();
</script>

<style scoped>
.booking-card {
  border-left: 4px solid #1976D2;
  cursor: pointer;
  transition: filter 0.15s ease;
}

.booking-card:hover {
  filter: brightness(0.97);
}

.booking-card__waitlist {
  display: flex;
  align-items: center;
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
}

.booking-time {
  min-width: 50px;
  flex-shrink: 0;
}

.booking-info {
  min-width: 0;
}

@media (max-width: 600px) {
  .booking-body {
    padding: 10px 12px;
  }
}
</style>
