<template>
  <div>
    <PageHeader title="Tenants" subtitle="Gestiona todos los negocios registrados" />
    <v-card>
      <DataTable
        :items="tenants"
        :total="tenants.length"
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
  { title: 'Nombre', key: 'name' },
  { title: 'Email', key: 'email' },
  { title: 'Plan', key: 'plan_id' },
  { title: 'Estado', key: 'status' },
];

const tenants: any[] = [];
const loading = ref(false);
</script>
