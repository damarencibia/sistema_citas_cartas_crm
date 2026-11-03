<template>
  <div>
    <PageHeader
      title="Clientes"
      subtitle="Base de datos de clientes, historial y fidelización"
    >
      <template #actions>
        <v-btn color="primary" @click="openCreate">
          <v-icon start>mdi-plus</v-icon>
          Nuevo Cliente
        </v-btn>
      </template>
    </PageHeader>

    <v-container fluid class="py-4 max-w-none">
      <!-- KPIs de cabecera -->
      <v-row v-if="customers.length > 0" class="mb-2">
        <v-col cols="12" sm="6" md="3">
          <v-card class="pa-4 d-flex align-center ga-3">
            <v-icon color="primary" size="24">mdi-account-group</v-icon>
            <div>
              <div class="text-h6 font-weight-bold">{{ customers.length }}</div>
              <div class="text-caption text-medium-emphasis">Clientes totales</div>
            </div>
          </v-card>
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <v-card class="pa-4 d-flex align-center ga-3">
            <v-icon color="success" size="24">mdi-account-check-outline</v-icon>
            <div>
              <div class="text-h6 font-weight-bold">{{ activeCount }}</div>
              <div class="text-caption text-medium-emphasis">Con visitas recientes</div>
            </div>
          </v-card>
        </v-col>
      </v-row>

      <!-- Skeletons (primera carga) -->
      <v-card v-if="store.loading" class="pa-4">
        <v-skeleton-loader type="table" />
      </v-card>

      <!-- Lista -->
      <v-card v-else>
        <div class="pa-4 pb-0">
          <v-row align="center">
            <v-col cols="12" sm="6" md="4">
              <SearchField label="Buscar clientes" @search="onSearch" />
            </v-col>
          </v-row>
        </div>

        <!-- Vacía: sin clientes -->
        <EmptyState
          v-if="customers.length === 0"
          icon="mdi-account-plus-outline"
          title="Todavía no tienes clientes"
          description="Los clientes se crean aquí o automáticamente cuando reservan una cita"
        >
          <template #actions>
            <v-btn color="primary" variant="flat" @click="openCreate">
              <v-icon start>mdi-plus</v-icon>
              Agendar primer cliente
            </v-btn>
          </template>
        </EmptyState>

        <!-- Vacía: sin resultados de búsqueda -->
        <EmptyState
          v-else-if="filteredCustomers.length === 0"
          icon="mdi-magnify"
          title="Sin resultados"
          :description="`Ningún cliente coincide con “${search}”`"
        />

        <DataTable
          v-else
          v-model:page="page"
          :items="pageItems"
          :total="filteredCustomers.length"
          :loading="false"
          :headers="headers"
          @click:row="openDetail"
        >
          <template #item.name="{ item }">
            <div class="d-flex align-center ga-3 py-1">
              <v-avatar size="32" color="primary" variant="tonal">
                <span class="text-caption font-weight-bold">{{ initialsOf(item) }}</span>
              </v-avatar>
              <div class="font-weight-medium">{{ fullNameOf(item) }}</div>
            </div>
          </template>
          <template #item.email="{ item }">
            <span class="text-body-2">{{ item.email || '—' }}</span>
          </template>
          <template #item.phone="{ item }">
            <span class="text-body-2">{{ item.phone || '—' }}</span>
          </template>
          <template #item.total_visits="{ item }">
            <span class="text-body-2">{{ item.total_visits ?? 0 }}</span>
          </template>
          <template #item.total_spent="{ item }">
            <span class="text-body-2 font-weight-medium">
              {{ formatCurrency(item.total_spent ?? 0) }}
            </span>
          </template>
          <template #item.last_visit_at="{ item }">
            <span v-if="item.last_visit_at" class="text-caption text-medium-emphasis">
              {{ formatRelative(item.last_visit_at) }}
            </span>
            <span v-else class="text-caption text-medium-emphasis">Nunca</span>
          </template>
          <template #item.actions="{ item }">
            <v-btn
              icon
              variant="text"
              size="small"
              aria-label="Editar cliente"
              @click.stop="openEdit(item)"
            >
              <v-icon size="18">mdi-pencil-outline</v-icon>
            </v-btn>
            <v-btn
              icon
              variant="text"
              size="small"
              color="error"
              aria-label="Eliminar cliente"
              @click.stop="onDelete(item)"
            >
              <v-icon size="18">mdi-trash-can-outline</v-icon>
            </v-btn>
          </template>
        </DataTable>
      </v-card>
    </v-container>

    <CustomerForm
      :visible="showForm"
      :customer="editingCustomer"
      :loading="saving"
      @close="showForm = false"
      @save="onSave"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import PageHeader from '@/shared/components/PageHeader.vue';
import DataTable from '@/shared/components/DataTable.vue';
import SearchField from '@/shared/components/SearchField.vue';
import EmptyState from '@/shared/components/EmptyState.vue';
import { useNotification } from '@/shared/composables/useNotification';
import { useConfirm } from '@/shared/composables/useConfirm';
import { formatCurrency, formatRelative } from '@/shared/utils/format';
import { useCustomerStore } from '../stores/customer.store';
import CustomerForm from '../components/CustomerForm.vue';
import type { CreateCustomerDTO, Customer } from '../types/customer.types';

const store = useCustomerStore();
const notification = useNotification();
const { confirm: confirmAction } = useConfirm();
const router = useRouter();

onMounted(() => {
  store.fetchCustomers();
});

const search = ref('');
const page = ref(1);

const customers = computed(() => store.customers);

/** Cliente con actividad en los últimos 90 días */
const activeCount = computed(() => {
  const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
  return customers.value.filter(
    (c) => c.last_visit_at && Date.parse(c.last_visit_at) >= cutoff,
  ).length;
});

const headers = [
  { title: 'Nombre', key: 'name', sortable: true },
  { title: 'Teléfono', key: 'phone', sortable: false },
  { title: 'Email', key: 'email', sortable: true },
  { title: 'Visitas', key: 'total_visits', sortable: true, align: 'end' },
  { title: 'Gastado', key: 'total_spent', sortable: true, align: 'end' },
  { title: 'Última visita', key: 'last_visit_at', sortable: true },
  { title: '', key: 'actions', sortable: false, align: 'end', width: '96px' },
] as const;

const filteredCustomers = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return customers.value;
  return customers.value.filter(
    (c) =>
      fullNameOf(c).toLowerCase().includes(q) ||
      (c.email ?? '').toLowerCase().includes(q) ||
      (c.phone ?? '').toLowerCase().includes(q),
  );
});

/** Pagination cliente-side: el wrapper DataTable pide items ya paginados */
const pageItems = computed(() => {
  const start = (page.value - 1) * 20;
  return filteredCustomers.value.slice(start, start + 20);
});

function onSearch(value: string) {
  search.value = value ?? '';
  page.value = 1; // nueva búsqueda → volver a la primera página
}

function fullNameOf(customer: Customer): string {
  return `${customer.first_name} ${customer.last_name}`.trim();
}

function initialsOf(customer: Customer): string {
  return `${customer.first_name?.[0] ?? ''}${customer.last_name?.[0] ?? ''}`.toUpperCase();
}

function openDetail(_event: unknown, row: { item: Customer }) {
  router.push(`/crm/customers/${row.item.id}`);
}
const showForm = ref(false);
const editingCustomer = ref<Customer | null>(null);
const saving = ref(false);

function openCreate() {
  editingCustomer.value = null;
  showForm.value = true;
}

function openEdit(customer: Customer) {
  editingCustomer.value = customer;
  showForm.value = true;
}

async function onSave(dto: CreateCustomerDTO) {
  saving.value = true;
  try {
    if (editingCustomer.value) {
      await store.updateCustomer(editingCustomer.value.id, dto);
      notification.success('Cliente actualizado');
    } else {
      await store.createCustomer(dto);
      notification.success('Cliente creado');
    }
    showForm.value = false;
    editingCustomer.value = null;
  } catch {
    notification.error('No se pudo guardar el cliente');
  } finally {
    saving.value = false;
  }
}

async function onDelete(customer: Customer) {
  const ok = await confirmAction(
    `Se eliminará "${fullNameOf(customer)}" y dejará de aparecer en la lista. Su historial de citas se conservará.`,
    'Eliminar Cliente',
    { danger: true, confirmText: 'Eliminar' },
  );
  if (!ok) return;
  try {
    await store.deleteCustomer(customer.id);
    notification.success('Cliente eliminado');
  } catch {
    notification.error('No se pudo eliminar el cliente');
  }
}
</script>
