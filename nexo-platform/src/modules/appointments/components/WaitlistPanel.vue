<template>
  <div>
    <div v-if="loading" class="text-center pa-4">
      <v-progress-circular indeterminate color="primary" size="small" />
    </div>

    <div v-else-if="entries.length === 0" class="text-center pa-4">
      <v-icon size="48" color="medium-emphasis">mdi-clock-outline</v-icon>
      <p class="text-body-2 text-medium-emphasis mt-2">No hay personas en la lista de espera</p>
    </div>

    <v-list v-else density="compact">
      <v-list-item
        v-for="entry in entries"
        :key="entry.id"
        :subtitle="`${entry.customer_email} · ${entry.preferred_date}`"
      >
        <template #title>
          <div class="d-flex align-center ga-2">
            <span>{{ entry.customer_name }}</span>
            <v-chip
              :color="statusColor(entry.status)"
              size="x-small"
              label
            >
              {{ statusLabel(entry.status) }}
            </v-chip>
          </div>
        </template>
        <template #append>
          <v-btn
            v-if="entry.status === 'waiting'"
            icon="mdi-close"
            size="x-small"
            variant="text"
            @click="emit('cancel', entry)"
          />
        </template>
      </v-list-item>
    </v-list>
  </div>
</template>

<script setup lang="ts">
import type { WaitlistEntry } from '../types/booking.types';

defineProps<{
  entries: WaitlistEntry[];
  loading: boolean;
}>();

const emit = defineEmits<{
  cancel: [entry: WaitlistEntry];
}>();

function statusColor(status: WaitlistEntry['status']): string {
  const map: Record<string, string> = {
    waiting: 'warning',
    notified: 'info',
    converted: 'success',
    expired: 'grey',
    cancelled: 'grey',
  };
  return map[status] ?? 'grey';
}

function statusLabel(status: WaitlistEntry['status']): string {
  const map: Record<string, string> = {
    waiting: 'Esperando',
    notified: 'Notificado',
    converted: 'Convertido',
    expired: 'Expirado',
    cancelled: 'Cancelado',
  };
  return map[status] ?? status;
}
</script>
