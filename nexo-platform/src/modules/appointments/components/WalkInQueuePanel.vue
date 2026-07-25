<template>
  <div>
    <div v-if="entries.length === 0" class="text-center pa-4">
      <v-icon size="48" color="medium-emphasis">mdi-account-group-outline</v-icon>
      <p class="text-body-2 text-medium-emphasis mt-2">Cola vacía</p>
    </div>

    <v-list v-else density="compact" lines="two">
      <v-list-item
        v-for="entry in entries"
        :key="entry.id"
        :title="entry.customer_name"
        :subtitle="entryStatusText(entry)"
      >
        <template #prepend>
          <v-avatar :color="entry.status === 'serving' ? 'success' : 'primary'" size="32">
            <span class="text-white text-caption font-weight-bold">{{ entry.position }}</span>
          </v-avatar>
        </template>
        <template #append>
          <v-btn
            v-if="entry.status === 'waiting'"
            icon="mdi-play"
            size="x-small"
            variant="text"
            color="success"
            title="Iniciar atención"
            @click="emit('startServing', entry)"
          />
          <v-btn
            v-if="entry.status === 'serving'"
            icon="mdi-check"
            size="x-small"
            variant="text"
            color="success"
            title="Completar"
            @click="emit('complete', entry)"
          />
          <v-btn
            icon="mdi-close"
            size="x-small"
            variant="text"
            color="error"
            title="Cancelar"
            @click="emit('cancel', entry)"
          />
        </template>
      </v-list-item>
    </v-list>
  </div>
</template>

<script setup lang="ts">
import type { WalkInEntry } from '../types/booking.types';

defineProps<{
  entries: WalkInEntry[];
  loading?: boolean;
}>();

const emit = defineEmits<{
  startServing: [entry: WalkInEntry];
  complete: [entry: WalkInEntry];
  cancel: [entry: WalkInEntry];
}>();

function entryStatusText(entry: WalkInEntry): string {
  const parts: string[] = [];
  if (entry.service?.name) parts.push(entry.service.name);
  if (entry.employee) parts.push(`${entry.employee.first_name} ${entry.employee.last_name}`);
  if (entry.status === 'serving') parts.push('Atendiendo...');
  if (entry.customer_phone) parts.push(entry.customer_phone);
  return parts.join(' · ') || (entry.status === 'serving' ? 'Atendiendo...' : 'En espera');
}
</script>
