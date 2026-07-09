<template>
  <div>
    <PageHeader title="Mesas" subtitle="Gestiona las mesas de tu local">
      <template #actions>
        <v-btn color="primary">
          <v-icon start>mdi-plus</v-icon>
          Nueva Mesa
        </v-btn>
      </template>
    </PageHeader>
    <v-card>
      <DataTable
        :items="tables"
        :total="tables.length"
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
  { title: 'Mesa', key: 'number' },
  { title: 'Capacidad', key: 'capacity' },
  { title: 'Ubicacion', key: 'location' },
  { title: 'Activa', key: 'is_active' },
];

const tables: any[] = [];
const loading = ref(false);
</script>
