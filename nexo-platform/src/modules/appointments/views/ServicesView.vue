<template>
  <div>
    <PageHeader title="Servicios" subtitle="Administra los servicios que ofreces">
      <template #actions>
        <v-btn color="primary">
          <v-icon start>mdi-plus</v-icon>
          Nuevo Servicio
        </v-btn>
      </template>
    </PageHeader>
    <v-card>
      <DataTable
        :items="services"
        :total="services.length"
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
  { title: 'Nombre', key: 'name' },
  { title: 'Duracion', key: 'duration_minutes' },
  { title: 'Precio', key: 'price' },
  { title: 'Estado', key: 'is_active' },
];

const services: any[] = [];
const loading = ref(false);
</script>
