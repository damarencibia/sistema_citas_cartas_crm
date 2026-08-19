<template>
  <div class="h-100 flex-grow-1 overflow-y-auto pa-4 d-flex flex-column ga-3">
    <div class="d-flex align-center ga-2">
      <v-icon size="small" color="primary">mdi-account-clock-outline</v-icon>
      <span class="text-subtitle-2 font-weight-bold">Cola de espera</span>
      <v-chip
        v-if="queueCount > 0"
        size="x-small"
        variant="tonal"
        color="primary"
        label
      >
        {{ queueCount }}
      </v-chip>
    </div>

    <v-card
      v-if="slotLabel"
      variant="outlined"
      rounded="lg"
      class="flex-shrink-0"
    >
      <div class="pa-3 d-flex flex-column ga-1">
        <div class="d-flex align-center ga-2">
          <v-icon size="small" color="medium-emphasis">mdi-view-grid-outline</v-icon>
          <span class="text-body-2 text-truncate font-weight-medium">
            {{ booking.service?.name || 'Servicio' }}
          </span>
          <v-avatar v-if="serviceCategory" :color="serviceColor" size="8" />
          <span v-if="serviceCategory" class="text-caption text-medium-emphasis">
            {{ serviceCategory }}
          </span>
        </div>
        <div class="d-flex align-center ga-2">
          <v-icon size="small" color="medium-emphasis">mdi-calendar</v-icon>
          <span class="text-body-2">{{ slotLabel }}</span>
        </div>
        <div v-if="employeeName" class="d-flex align-center ga-2">
          <v-icon size="small" color="medium-emphasis">mdi-account</v-icon>
          <span class="text-body-2">{{ employeeName }}</span>
        </div>
      </div>
    </v-card>

    <WaitlistQueueList
      v-if="hasWaitlist"
      :entries="waitlistEntries ?? []"
      :slot-label="slotLabel"
      :tenant-name="tenantName"
      hide-header
      @convert="emit('waitlistConvert', $event)"
      @remove="emit('waitlistRemove', $event)"
    />
    <div v-else class="text-center pa-8">
      <v-icon size="48" color="medium-emphasis">mdi-account-clock-outline</v-icon>
      <p class="text-body-2 text-medium-emphasis mt-2">
        No hay personas en la cola para este turno.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import WaitlistQueueList from './WaitlistQueueList.vue';
import type { Booking, WaitlistEntry } from '../types/booking.types';

const props = defineProps<{
  booking: Booking;
  waitlistEntries?: WaitlistEntry[];
  tenantName?: string;
}>();

const emit = defineEmits<{
  waitlistConvert: [entry: WaitlistEntry];
  waitlistRemove: [entry: WaitlistEntry];
}>();

const queueCount = computed(() => props.waitlistEntries?.length ?? 0);
const hasWaitlist = computed(() => queueCount.value > 0);

const slotLabel = computed(() => {
  const time = props.booking.start_time?.slice(0, 5);
  return time ? `${props.booking.date} a las ${time}` : props.booking.date;
});

const employeeName = computed(() => {
  const e = props.booking.employee;
  if (!e) return null;
  return `${e.first_name} ${e.last_name}`;
});

const serviceCategory = computed(() => props.booking.service?.category?.name ?? null);
const serviceColor = computed(() => props.booking.service?.color ?? '#1976D2');
</script>
