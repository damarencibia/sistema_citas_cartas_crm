<template>
  <div>
    <PageHeader title="Empleados" subtitle="Gestiona los empleados de tu negocio">
      <template #actions>
        <v-btn color="primary">
          <v-icon start>mdi-plus</v-icon>
          Nuevo Empleado
        </v-btn>
      </template>
    </PageHeader>
    <v-card>
      <DataTable
        :items="employees"
        :total="employees.length"
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
  { title: 'Nombre', key: 'first_name' },
  { title: 'Email', key: 'email' },
  { title: 'Telefono', key: 'phone' },
  { title: 'Estado', key: 'is_active' },
];

const employees: any[] = [];
const loading = ref(false);
</script>
