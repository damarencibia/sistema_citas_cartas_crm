<template>
  <div class="pa-4">
    <div v-if="loading" class="text-center pa-8">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <div v-else-if="categories.length === 0" class="text-center pa-8 text-medium-emphasis">
      <v-icon size="48">mdi-shape-outline</v-icon>
      <p class="mt-2">No hay categorías configuradas</p>
    </div>

    <v-expansion-panels v-else variant="accordion">
      <v-expansion-panel
        v-for="cat in categories"
        :key="cat.id"
      >
        <v-expansion-panel-title>
          <div class="d-flex align-center ga-2">
            <v-icon>{{ cat.icon || 'mdi-tag-outline' }}</v-icon>
            <span class="text-body-1 font-weight-medium">{{ cat.name }}</span>
            <v-chip size="x-small" color="primary" variant="tonal">
              {{ getEmployeeCount(cat.id) }} empleados
            </v-chip>
            <v-chip size="x-small" variant="tonal">
              {{ getServiceCount(cat.id) }} servicios
            </v-chip>
          </div>
        </v-expansion-panel-title>

        <v-expansion-panel-text>
          <div v-if="getEmployeesForCategory(cat.id).length === 0" class="text-caption text-medium-emphasis pa-2">
            Sin empleados asociados
          </div>
          <v-expansion-panels v-else variant="accordion" class="ml-4">
            <v-expansion-panel
              v-for="emp in getEmployeesForCategory(cat.id)"
              :key="emp.id"
            >
              <v-expansion-panel-title class="text-body-2">
                <div class="d-flex align-center ga-2">
                  <v-avatar :color="emp.color" size="28">
                    <span class="text-white text-caption">{{ emp.first_name[0] }}{{ emp.last_name[0] }}</span>
                  </v-avatar>
                  {{ emp.first_name }} {{ emp.last_name }}
                </div>
              </v-expansion-panel-title>
              <v-expansion-panel-text>
                <v-list density="compact" class="ml-4">
                  <v-list-item
                    v-for="svc in getServicesForEmployeeAndCategory(emp.id, cat.id)"
                    :key="svc.id"
                  >
                    <template #prepend>
                      <div class="color-dot" :style="{ backgroundColor: svc.color }" />
                    </template>
                    <v-list-item-title>{{ svc.name }}</v-list-item-title>
                    <v-list-item-subtitle>
                      {{ svc.duration_minutes }} min · {{ formatPrice(svc.price) }}
                    </v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useServiceCategoryStore } from '../stores/service-category.store';
import { useServiceStore } from '../stores/service.store';
import { useEmployeeStore } from '../stores/employee.store';

const categoryStore = useServiceCategoryStore();
const serviceStore = useServiceStore();
const employeeStore = useEmployeeStore();
const loading = ref(true);

const categories = ref(categoryStore.categories);

onMounted(async () => {
  loading.value = true;
  await Promise.all([
    categoryStore.fetchCategories(),
    serviceStore.fetchServices(),
    employeeStore.fetchEmployees(),
  ]);
  categories.value = categoryStore.categories;
  loading.value = false;
});

function getEmployeesForCategory(categoryId: string) {
  const empIds = new Set(
    serviceStore.services
      .filter((s) => s.category_id === categoryId && s.employee_id)
      .map((s) => s.employee_id),
  );
  return employeeStore.employees.filter((e) => empIds.has(e.id));
}

function getServicesForEmployeeAndCategory(employeeId: string, categoryId: string) {
  return serviceStore.services.filter(
    (s) => s.employee_id === employeeId && s.category_id === categoryId,
  );
}

function getEmployeeCount(categoryId: string) {
  return getEmployeesForCategory(categoryId).length;
}

function getServiceCount(categoryId: string) {
  return serviceStore.services.filter((s) => s.category_id === categoryId).length;
}

function formatPrice(centavos: number): string {
  return `$${(centavos / 100).toFixed(2)}`;
}
</script>

<style scoped>
.color-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-right: 8px;
}
</style>
