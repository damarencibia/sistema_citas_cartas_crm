<template>
  <div>
    <div v-if="loading" class="text-center pa-6">
      <v-progress-circular indeterminate color="primary" size="28" />
    </div>

    <div v-else-if="entries.length === 0" class="text-center pa-6">
      <v-icon size="48" color="medium-emphasis">mdi-clock-outline</v-icon>
      <p class="text-body-2 text-medium-emphasis mt-2">No hay personas en la lista de espera</p>
    </div>

    <template v-else>
      <div class="d-flex align-center ga-2 mb-3 flex-wrap">
        <v-chip
          v-for="f in filterOptions"
          :key="f.value"
          size="small"
          :variant="statusFilter === f.value ? 'flat' : 'tonal'"
          :color="statusFilter === f.value ? 'primary' : 'default'"
          @click="statusFilter = f.value"
        >
          {{ f.label }}
          <span class="ml-1 text-caption">{{ f.count }}</span>
        </v-chip>
      </div>

      <v-list v-if="filteredEntries.length" density="compact">
        <v-list-item
          v-for="entry in filteredEntries"
          :key="entry.id"
          :subtitle="`${entry.customer_email} · ${entry.preferred_date} · ${entry.preference === 'flexible' ? 'Cualquier hora' : (entry.preferred_time_start ? entry.preferred_time_start.slice(0, 5) : 'Sin preferencia')}`"
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
            <div v-if="entry.status === 'waiting' || entry.status === 'notified'" class="d-flex ga-1">
              <v-btn
                size="small"
                variant="tonal"
                color="primary"
                prepend-icon="mdi-calendar-plus"
                title="Convertir en cita"
                @click="emit('convert', entry)"
              >
                Cita
              </v-btn>
              <v-btn
                size="small"
                icon="mdi-close"
                variant="text"
                title="Eliminar"
                @click="emit('cancel', entry)"
              />
            </div>
          </template>
        </v-list-item>
      </v-list>

      <div v-else class="text-center pa-4">
        <p class="text-body-2 text-medium-emphasis">Sin entradas en este estado</p>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { WaitlistEntry } from '../types/booking.types';

const props = defineProps<{
  entries: WaitlistEntry[];
  loading: boolean;
}>();

const emit = defineEmits<{
  cancel: [entry: WaitlistEntry];
  convert: [entry: WaitlistEntry];
}>();

const statusFilter = ref<'all' | WaitlistEntry['status']>('all');

const filterOptions = computed(() => {
  const count = (s: WaitlistEntry['status'] | 'all') =>
    s === 'all' ? props.entries.length : props.entries.filter((e) => e.status === s).length;
  return [
    { value: 'all' as const, label: 'Todas', count: count('all') },
    { value: 'waiting' as const, label: 'Esperando', count: count('waiting') },
    { value: 'notified' as const, label: 'Notificado', count: count('notified') },
    { value: 'converted' as const, label: 'Convertido', count: count('converted') },
  ];
});

const filteredEntries = computed(() =>
  statusFilter.value === 'all'
    ? props.entries
    : props.entries.filter((e) => e.status === statusFilter.value),
);

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
