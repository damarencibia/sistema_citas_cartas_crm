<template>
  <div>
    <PageHeader title="Clientes" subtitle="Gestiona tus clientes">
      <template #actions>
        <v-btn color="primary">
          <v-icon start>mdi-plus</v-icon>
          Nuevo Cliente
        </v-btn>
      </template>
    </PageHeader>
    <v-card>
      <template #title>
        <v-text-field
          v-model="search"
          prepend-inner-icon="mdi-magnify"
          label="Buscar clientes..."
          hide-details
          density="compact"
          variant="outlined"
          class="mx-4 mt-4"
        />
      </template>
      <DataTable
        :items="customers"
        :total="customers.length"
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

const search = ref('');
const headers = [
  { title: 'Nombre', key: 'first_name' },
  { title: 'Email', key: 'email' },
  { title: 'Telefono', key: 'phone' },
  { title: 'Visitas', key: 'total_visits' },
  { title: 'Gastado', key: 'total_spent' },
];

const customers: any[] = [];
const loading = ref(false);
</script>
