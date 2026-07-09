<template>
  <div>
    <PageHeader title="Equipo" subtitle="Gestiona los miembros de tu negocio">
      <template #actions>
        <v-dialog v-model="inviteDialog" max-width="500">
          <template #activator="{ props }">
            <v-btn color="primary" v-bind="props">
              <v-icon start>mdi-account-plus</v-icon>
              Invitar Empleado
            </v-btn>
          </template>
          <v-card class="pa-6">
            <h3 class="text-h6 font-weight-bold mb-4">Invitar Empleado</h3>
            <v-text-field v-model="inviteEmail" label="Correo electrónico" type="email" />
            <v-select v-model="inviteRole" :items="roles" label="Rol" />
            <v-btn
              color="primary"
              block
              :loading="sending"
              @click="sendInvite"
            >
              Enviar Invitación
            </v-btn>
          </v-card>
        </v-dialog>
      </template>
    </PageHeader>

    <v-card>
      <DataTable
        :items="employees"
        :total="employees.length"
        :loading="loading"
        :headers="headers"
      >
        <template #[`item.role`]="{ value }">
          <StatusBadge :status="value" />
        </template>
        <template #[`item.is_active`]="{ value }">
          <v-switch
            :model-value="value"
            density="compact"
            hide-details
            readonly
          />
        </template>
      </DataTable>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { supabase } from '@/shared/api/supabase.client';
import { useTenantStore } from '@/shared/stores/tenant.store';
import PageHeader from '@/shared/components/PageHeader.vue';
import DataTable from '@/shared/components/DataTable.vue';
import StatusBadge from '@/shared/components/StatusBadge.vue';

const tenantStore = useTenantStore();

const headers = [
  { title: 'Nombre', key: 'first_name' },
  { title: 'Email', key: 'email' },
  { title: 'Rol', key: 'role' },
  { title: 'Activo', key: 'is_active' },
];

const employees = ref<any[]>([]);
const loading = ref(true);
const inviteDialog = ref(false);
const inviteEmail = ref('');
const inviteRole = ref('employee');
const sending = ref(false);
const roles = ['admin', 'employee'];

onMounted(async () => {
  const tenantId = tenantStore.tenant?.id;
  if (!tenantId) {
    loading.value = false;
    return;
  }
  const { data } = await supabase.from('users').select('*').eq('tenant_id', tenantId);
  employees.value = data ?? [];
  loading.value = false;
});

async function sendInvite() {
  sending.value = true;
  await new Promise((r) => setTimeout(r, 1000));
  sending.value = false;
  inviteDialog.value = false;
}
</script>
