<template>
  <div>
    <PageHeader title="Mis Servicios" subtitle="Administra los servicios que ofreces">
      <template #actions>
        <v-btn color="primary" @click="openCreate">
          <v-icon start>mdi-plus</v-icon>
          Nuevo Servicio
        </v-btn>
      </template>
    </PageHeader>

    <div v-if="loading" class="text-center pa-8">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <div v-else-if="myServices.length === 0" class="text-center pa-8">
      <v-icon size="64" color="medium-emphasis">mdi-tag-outline</v-icon>
      <p class="text-body-1 text-medium-emphasis mt-4">No tienes servicios configurados</p>
      <p class="text-caption text-medium-emphasis mb-4">Agrega los servicios que ofreces dentro de las categorías del negocio</p>
      <v-btn color="primary" variant="flat" @click="openCreate">
        Crear Primer Servicio
      </v-btn>
    </div>

    <template v-else>
      <template v-for="cat in myCategories" :key="cat.id">
        <div class="d-flex align-center ga-2 mb-2 mt-4">
          <v-icon size="20">{{ cat.icon || 'mdi-tag-outline' }}</v-icon>
          <span class="text-subtitle-1 font-weight-medium">{{ cat.name }}</span>
        </div>
        <v-row>
          <v-col
            v-for="svc in servicesInCategory(cat.id)"
            :key="svc.id"
            cols="12"
            sm="6"
            md="4"
          >
            <ServiceCard
              :service="svc"
              :show-actions="true"
              @edit="openEdit(svc)"
              @delete="onDelete(svc)"
            />
          </v-col>
        </v-row>
      </template>
    </template>

    <ServiceForm
      :visible="showForm"
      :service="editingService"
      :preselected-employee-id="myEmployeeId"
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
import { useAuthStore } from '@/shared/stores/auth.store';
import { useServiceCategoryStore } from '../stores/service-category.store';
import { useServiceStore } from '../stores/service.store';
import { useEmployeeStore } from '../stores/employee.store';
import ServiceCard from '../components/ServiceCard.vue';
import ServiceForm from '../components/ServiceForm.vue';
import type { Service, CreateServiceDTO } from '../types/service.types';

const authStore = useAuthStore();
const categoryStore = useServiceCategoryStore();
const serviceStore = useServiceStore();
const employeeStore = useEmployeeStore();
const notification = useNotification();
const { confirm } = useConfirm();

const loading = ref(true);
const showForm = ref(false);
const editingService = ref<Service | null>(null);
const myEmployeeId = ref('');

const myServices = computed(() => {
  if (!myEmployeeId.value) return [];
  return serviceStore.services.filter((s) => s.employee_id === myEmployeeId.value);
});

const myCategories = computed(() => {
  const catIds = new Set(myServices.value.map((s) => s.category_id));
  return categoryStore.categories.filter((c) => catIds.has(c.id));
});

function servicesInCategory(categoryId: string) {
  return myServices.value.filter((s) => s.category_id === categoryId);
}

onMounted(async () => {
  loading.value = true;
  const userId = authStore.user?.id;
  if (!userId) return;

  await employeeStore.fetchEmployees();
  const myEmployee = employeeStore.employees.find((e) => e.user_id === userId);
  if (myEmployee) {
    myEmployeeId.value = myEmployee.id;
  }

  await Promise.all([
    categoryStore.fetchCategories(),
    serviceStore.fetchServices(),
  ]);
  loading.value = false;
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
    const payload = { ...dto, employee_id: dto.employee_id || myEmployeeId.value };
    if (editingService.value) {
      await serviceStore.updateService(editingService.value.id, payload);
      notification.success('Servicio actualizado');
    } else {
      await serviceStore.createService(payload);
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
