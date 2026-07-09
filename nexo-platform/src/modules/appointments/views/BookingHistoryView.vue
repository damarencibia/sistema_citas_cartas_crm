<template>
  <div>
    <PageHeader title="Historial de Citas" subtitle="Historial completo de reservas" />
    <v-card>
      <DataTable
        :items="bookings"
        :total="bookings.length"
        :loading="loading"
        :headers="headers"
      />
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import PageHeader from '@/shared/components/PageHeader.vue';
import DataTable from '@/shared/components/DataTable.vue';

const headers = [
  { title: 'Cliente', key: 'customer_name' },
  { title: 'Servicio', key: 'service_name' },
  { title: 'Fecha', key: 'date' },
  { title: 'Estado', key: 'status' },
];

const bookings: any[] = [];
const loading = ref(false);
</script>
