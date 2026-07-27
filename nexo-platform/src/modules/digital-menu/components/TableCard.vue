<template>
  <v-card class="mb-4" elevation="1">
    <v-card-title>
      <div>
        <div class="text-subtitle-1 font-weight-medium">Mesa {{ table.number }}</div>
        <div class="text-caption text-medium-emphasis">Capacidad {{ table.capacity ?? '-' }}</div>
      </div>
      <v-spacer />
      <v-chip :color="table.is_active ? 'success' : 'grey'" small>
        {{ table.is_active ? 'Activa' : 'Inactiva' }}
      </v-chip>
    </v-card-title>
    <v-card-text>
      <QRCodeDisplay :value="qrUrl" />
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Table } from '../types/table.types';
import QRCodeDisplay from './QRCodeDisplay.vue';
import { useTenantStore } from '@/shared/stores/tenant.store';

const props = defineProps<{ table: Table }>();
const tenantStore = useTenantStore();

const qrUrl = computed(() => {
  const slug = tenantStore.tenant?.slug ?? 'menu';
  return `${window.location.origin}/${slug}/menu?table=${props.table.number}`;
});
</script>
