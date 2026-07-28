<template>
  <div>
    <PageHeader title="Servicios" subtitle="Administra los servicios del negocio">
      <template #actions>
        <v-btn color="primary" @click="openCreate">
          <v-icon start>mdi-plus</v-icon>
          Nuevo Servicio
        </v-btn>
      </template>
    </PageHeader>

    <div v-if="serviceStore.loading" class="text-center pa-8">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <div v-else-if="serviceStore.services.length === 0" class="text-center pa-8">
      <v-icon size="64" color="medium-emphasis">mdi-tag-outline</v-icon>
      <p class="text-body-1 text-medium-emphasis mt-4">No hay servicios configurados</p>
      <v-btn color="primary" variant="flat" class="mt-4" @click="openCreate">
        Crear Primer Servicio
      </v-btn>
    </div>

    <template v-else>
      <v-row class="mb-4">
        <v-col cols="12" sm="4">
          <v-select
            v-model="filterEmployee"
            :items="employeeOptions"
            item-title="text"
            item-value="value"
            label="Filtrar por empleado"
            clearable
            density="compact"
            variant="outlined"
            hide-details
          />
        </v-col>
        <v-col cols="12" sm="4">
          <v-select
            v-model="filterCategory"
            :items="categoryOptions"
            item-title="text"
            item-value="value"
            label="Filtrar por categoría"
            clearable
            density="compact"
            variant="outlined"
            hide-details
          />
        </v-col>
      </v-row>

      <v-row>
        <v-col
          v-for="service in filteredServices"
          :key="service.id"
          cols="12"
          sm="6"
          md="4"
        >
          <ServiceCard
            :service="service"
            :show-actions="true"
            @edit="openEdit"
            @delete="onDelete"
          />
        </v-col>
      </v-row>
    </template>

    <ServiceForm
      :visible="showForm"
      :service="editingService"
      @close="closeForm"
      @save="onSave"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import PageHeader from '@/shared/components/PageHeader.vue';
import { useNotification } from '@/shared/composables/useNotification';
import { useConfirm } from '@/shared/composables/useConfirm';
import { useServiceStore } from '../stores/service.store';
import { useEmployeeStore } from '../stores/employee.store';
import { useServiceCategoryStore } from '../stores/service-category.store';
import ServiceCard from '../components/ServiceCard.vue';
import ServiceForm from '../components/ServiceForm.vue';
import type { Service, CreateServiceDTO } from '../types/service.types';

const serviceStore = useServiceStore();
const employeeStore = useEmployeeStore();
const categoryStore = useServiceCategoryStore();
const notification = useNotification();
const { confirm } = useConfirm();

const showForm = ref(false);
const editingService = ref<Service | null>(null);
const filterEmployee = ref<string | null>(null);
const filterCategory = ref<string | null>(null);

const filteredServices = computed(() => {
  let result = serviceStore.services;
  if (filterEmployee.value) {
    result = result.filter((s) => s.employee_id === filterEmployee.value);
  }
  if (filterCategory.value) {
    result = result.filter((s) => s.category_id === filterCategory.value);
  }
  return result;
});

const employeeOptions = computed(() =>
  employeeStore.activeEmployees.map((e) => ({
    value: e.id,
    text: `${e.first_name} ${e.last_name}`,
  })),
);

const categoryOptions = computed(() =>
  categoryStore.activeCategories.map((c) => ({
    value: c.id,
    text: c.name,
  })),
);

onMounted(() => {
  Promise.all([
    serviceStore.fetchServices(),
    employeeStore.fetchEmployees(),
    categoryStore.fetchCategories(),
  ]);
});

function openCreate() {
  editingService.value = null;
  showForm.value = true;
}

function openEdit(service: Service) {
  editingService.value = service;
  showForm.value = true;
}

function closeForm() {
  showForm.value = false;
  editingService.value = null;
}

async function onSave(dto: CreateServiceDTO) {
  try {
    if (editingService.value) {
      await serviceStore.updateService(editingService.value.id, dto);
      notification.success('Servicio actualizado');
    } else {
      await serviceStore.createService(dto);
      notification.success('Servicio creado');
    }
    closeForm();
  } catch {
    notification.error('Error al guardar servicio');
  }
}

async function onDelete(service: Service) {
  const ok = await confirm(`¿Eliminar el servicio "${service.name}"?`);
  if (!ok) return;
  try {
    await serviceStore.deleteService(service.id);
    notification.success('Servicio eliminado');
  } catch {
    notification.error('Error al eliminar servicio');
  }
}
</script>
