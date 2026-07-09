<template>
  <div>
    <PageHeader title="Reservas" subtitle="Todas las reservas del negocio" />
    <v-card>
      <DataTable
        :items="bookings"
        :total="bookings.length"
        :loading="loading"
        :headers="headers"
      >
        <template #[`item.status`]="{ value }">
          <StatusBadge :status="value" />
        </template>
      </DataTable>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import PageHeader from '@/shared/components/PageHeader.vue';
import DataTable from '@/shared/components/DataTable.vue';
import StatusBadge from '@/shared/components/StatusBadge.vue';

const headers = [
  { title: 'Cliente', key: 'customer_name' },
  { title: 'Servicio', key: 'service_name' },
  { title: 'Fecha', key: 'date' },
  { title: 'Hora', key: 'start_time' },
  { title: 'Estado', key: 'status' },
];

const bookings: any[] = [];
const loading = ref(false);
</script>
