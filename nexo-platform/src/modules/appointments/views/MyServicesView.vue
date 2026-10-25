<template>
  <div>
    <PageHeader title="Mis Servicios" subtitle="Elige qué servicios ofreces dentro de tus categorías">
      <template #actions>
        <v-btn color="primary" :disabled="!myCategories.length" @click="openCreate">
          <v-icon start>mdi-plus</v-icon>
          Nuevo Servicio
        </v-btn>
      </template>
    </PageHeader>

    <div v-if="loading" class="text-center pa-8">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <div v-else-if="!myCategories.length" class="text-center pa-8">
      <v-icon size="64" color="medium-emphasis">mdi-shape-outline</v-icon>
      <p class="text-body-1 text-medium-emphasis mt-4">Aún no tienes categorías asignadas</p>
      <p class="text-caption text-medium-emphasis mb-4">
        El administrador de tu negocio te asignará categorías desde Empleados;
        los servicios que cree dentro de ellas aparecerán aquí para que los ofrezcas.
      </p>
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
            <v-card
              :variant="isEnabled(svc) ? 'elevated' : 'outlined'"
              :class="{ 'opacity-60': !isEnabled(svc) }"
            >
              <v-card-text>
                <div class="d-flex align-center justify-space-between ga-2">
                  <div class="flex-grow-1" style="min-width: 0;">
                    <div class="text-body-1 font-weight-medium text-truncate">{{ svc.name }}</div>
                    <div class="text-caption text-medium-emphasis">
                      {{ svc.duration_minutes }} min · ${{ (svc.price / 100).toFixed(2) }}
                    </div>
                  </div>
                  <v-switch
                    :model-value="isEnabled(svc)"
                    color="primary"
                    density="compact"
                    hide-details
                    :loading="togglingServiceId === svc.id"
                    @update:model-value="onToggle(svc, $event === true)"
                  />
                </div>
                <div class="d-flex ga-1 mt-2">
                  <v-btn
                    icon="mdi-pencil"
                    size="x-small"
                    variant="text"
                    @click="openEdit(svc)"
                  />
                  <v-btn
                    icon="mdi-delete"
                    size="x-small"
                    variant="text"
                    color="error"
                    @click="onDelete(svc)"
                  />
                  <v-spacer />
                  <span
                    class="text-caption"
                    :class="isEnabled(svc) ? 'text-success' : 'text-medium-emphasis'"
                  >
                    {{ isEnabled(svc) ? 'Lo ofrezco' : 'No lo ofrezco' }}
                  </span>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col
            v-if="!servicesInCategory(cat.id).length"
            cols="12"
            sm="6"
            md="4"
          >
            <v-card variant="outlined" class="d-flex align-center justify-center" min-height="110">
              <div class="text-center text-caption text-medium-emphasis pa-2">
                Sin servicios en esta categoría aún
              </div>
            </v-card>
          </v-col>
        </v-row>
      </template>
    </template>

    <ServiceForm
      :visible="showForm"
      :service="editingService"
      :allowed-category-ids="myCategoryIds"
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
import { employeeRepository } from '../repositories/employee.repository';
import ServiceForm from '../components/ServiceForm.vue';
import type { Service, CreateServiceDTO } from '../types/service.types';
import type { Employee } from '../types/employee.types';

const authStore = useAuthStore();
const categoryStore = useServiceCategoryStore();
const serviceStore = useServiceStore();
const employeeStore = useEmployeeStore();
const notification = useNotification();
const { confirm } = useConfirm();

const loading = ref(true);
const showForm = ref(false);
const editingService = ref<Service | null>(null);
const myEmployee = ref<Employee | null>(null);
const togglingServiceId = ref<string | null>(null);

// Categorías asignadas por el admin al empleado (nuevo modelo)
const myCategories = ref<NonNullable<Employee['categories']>>([]);
const myCategoryIds = computed(() => myCategories.value.map((c) => c.id));

// Servicios del tenant que pertenecen a las categorías del empleado
const myServices = computed(() => {
  if (!myCategoryIds.value.length) return [];
  const ids = new Set(myCategoryIds.value);
  return serviceStore.services.filter((s) => ids.has(s.category_id));
});

// Servicios que actualmente marco como "lo ofrezco"
const enabledServiceIds = ref<Set<string>>(new Set());

function servicesInCategory(categoryId: string) {
  return myServices.value.filter((s) => s.category_id === categoryId);
}

function isEnabled(service: Service) {
  return enabledServiceIds.value.has(service.id);
}

onMounted(async () => {
  loading.value = true;
  const userId = authStore.user?.id;
  if (!userId) return;

  await employeeStore.fetchEmployees();
  myEmployee.value = employeeStore.employees.find((e) => e.user_id === userId) ?? null;

  await Promise.all([
    categoryStore.fetchCategories(),
    serviceStore.fetchServices(),
  ]);

  if (myEmployee.value) {
    const [cats, performed] = await Promise.all([
      employeeRepository.getCategoriesByEmployee(myEmployee.value.id),
      employeeRepository.getServicesByEmployee(myEmployee.value.id),
    ]);
    myCategories.value = cats ?? [];
    enabledServiceIds.value = new Set(performed.map((s) => s.id));
  } else {
    myCategories.value = [];
  }
  loading.value = false;
});

async function onToggle(service: Service, value: boolean) {
  if (!myEmployee.value) return;
  togglingServiceId.value = service.id;
  try {
    await employeeStore.setServiceEnabled(myEmployee.value.id, service.id, value);
    const next = new Set(enabledServiceIds.value);
    if (value) next.add(service.id);
    else next.delete(service.id);
    enabledServiceIds.value = next;
    notification.success(value ? 'Ahora ofreces este servicio' : 'Dejaste de ofrecer este servicio');
  } catch {
    notification.error('Error al actualizar el servicio');
  } finally {
    togglingServiceId.value = null;
  }
}

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
  if (!myEmployee.value) return;
  try {
    if (editingService.value) {
      await serviceStore.updateService(editingService.value.id, dto);
      notification.success('Servicio actualizado');
    } else {
      // Servicio propio: queda vinculado automáticamente a mi oferta
      const created = await serviceStore.createService(dto);
      await employeeStore.setServiceEnabled(myEmployee.value.id, created.id, true);
      enabledServiceIds.value = new Set([...enabledServiceIds.value, created.id]);
      notification.success('Servicio creado y disponible para tus citas');
    }
    await serviceStore.fetchServices();
    closeForm();
  } catch {
    notification.error('Error al guardar servicio');
  }
}

async function onDelete(service: Service) {
  const ok = await confirm(
    `¿Eliminar el servicio "${service.name}"? Dejará de estar disponible para todos los empleados.`,
  );
  if (!ok) return;
  try {
    await serviceStore.deleteService(service.id);
    enabledServiceIds.value = new Set(
      [...enabledServiceIds.value].filter((id) => id !== service.id),
    );
    notification.success('Servicio eliminado');
  } catch {
    notification.error('Error al eliminar servicio');
  }
}
</script>
