<template>
  <div>
    <PageHeader title="Auditoria" subtitle="Registro de actividades del sistema" />
    <v-card>
      <DataTable
        :items="logs"
        :total="logs.length"
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
  { title: 'Usuario', key: 'user_name' },
  { title: 'Accion', key: 'action' },
  { title: 'Entidad', key: 'entity_type' },
  { title: 'Fecha', key: 'created_at' },
];

const logs: any[] = [];
const loading = ref(false);
</script>
