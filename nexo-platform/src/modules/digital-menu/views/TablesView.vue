<template>
  <div>
    <PageHeader title="Mesas" subtitle="Gestiona las mesas de tu local">
      <template #actions>
        <v-btn color="primary" @click="openDialog = true">
          <v-icon start>mdi-plus</v-icon>
          Nueva mesa
        </v-btn>
      </template>
    </PageHeader>

    <v-card>
      <DataTable :items="tables" :total="tables.length" :loading="loading" :headers="headers">
        <template #item.is_active="{ item }">
          <v-chip :color="item.is_active ? 'success' : 'grey'" small>
            {{ item.is_active ? 'Activa' : 'Inactiva' }}
          </v-chip>
        </template>
      </DataTable>
    </v-card>

    <v-dialog v-model="openDialog" width="520">
      <v-card>
        <v-card-title>Nueva mesa</v-card-title>
        <v-card-text>
          <v-form ref="formRef" lazy-validation>
            <v-text-field v-model="form.number" label="Número" required class="mb-4" />
            <v-text-field v-model.number="form.capacity" type="number" label="Capacidad" class="mb-4" />
            <v-text-field v-model="form.location" label="Ubicación" class="mb-4" />
            <v-switch v-model="form.is_active" label="Activa" class="mb-4" />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="closeDialog">Cancelar</v-btn>
          <v-btn color="primary" @click="saveTable">Guardar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import PageHeader from '@/shared/components/PageHeader.vue';
import DataTable from '@/shared/components/DataTable.vue';
import { useTableStore } from '../stores/table.store';
import { useAuthStore } from '@/shared/stores/auth.store';

const tableStore = useTableStore();
const openDialog = ref(false);
const formRef = ref();

const form = reactive({
  number: '',
  capacity: 0,
  location: '',
  is_active: true,
});

const headers = [
  { title: 'Mesa', key: 'number' },
  { title: 'Capacidad', key: 'capacity' },
  { title: 'Ubicación', key: 'location' },
  { title: 'Activa', key: 'is_active' },
];

const tables = tableStore.tables;
const loading = tableStore.loading;

onMounted(async () => {
  await tableStore.fetchTables();
});

function closeDialog() {
  openDialog.value = false;
}

const authStore = useAuthStore();

async function saveTable() {
  if (!form.number.trim()) return;
  const tenantId = authStore.user?.tenant_id;
  if (!tenantId) return;

  await tableStore.createTable({
    number: form.number,
    capacity: form.capacity || null,
    location: form.location || null,
    is_active: form.is_active,
    tenant_id: tenantId,
    qr_code_url: null,
  });
  closeDialog();
}
</script>
