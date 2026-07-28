<template>
  <div class="pa-4">
    <div v-if="loading" class="text-center pa-8">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <div v-else-if="employees.length === 0" class="text-center pa-8 text-medium-emphasis">
      <v-icon size="48">mdi-account-group-outline</v-icon>
      <p class="mt-2">No hay empleados registrados</p>
    </div>

    <v-expansion-panels v-else variant="accordion">
      <v-expansion-panel
        v-for="emp in employees"
        :key="emp.id"
      >
        <v-expansion-panel-title>
          <div class="d-flex align-center ga-2">
            <v-avatar :color="emp.color" size="32">
              <span class="text-white text-body-2">{{ emp.first_name[0] }}{{ emp.last_name[0] }}</span>
            </v-avatar>
            <span class="text-body-1 font-weight-medium">{{ emp.first_name }} {{ emp.last_name }}</span>
            <v-chip size="x-small" variant="tonal">
              {{ servicesByEmployee(emp.id).length }} servicios
            </v-chip>
          </div>
        </v-expansion-panel-title>

        <v-expansion-panel-text>
          <div v-if="servicesByEmployee(emp.id).length === 0" class="text-caption text-medium-emphasis pa-2">
            Sin servicios registrados
          </div>
          <div v-else>
            <template v-for="cat in categoriesWithServices(emp.id)" :key="cat.id">
              <v-list-subheader class="d-flex align-center ga-1">
                <v-icon size="16">{{ cat.icon || 'mdi-tag-outline' }}</v-icon>
                {{ cat.name }}
              </v-list-subheader>
              <v-list density="compact" class="ml-4">
                <v-list-item
                  v-for="svc in servicesForCategory(emp.id, cat.id)"
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
            </template>
          </div>
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

const employees = ref(employeeStore.employees);
const categories = ref(categoryStore.categories);

onMounted(async () => {
  loading.value = true;
  await Promise.all([
    categoryStore.fetchCategories(),
    serviceStore.fetchServices(),
    employeeStore.fetchEmployees(),
  ]);
  employees.value = employeeStore.employees;
  categories.value = categoryStore.categories;
  loading.value = false;
});

function servicesByEmployee(employeeId: string) {
  return serviceStore.services.filter((s) => s.employee_id === employeeId);
}

function categoriesWithServices(employeeId: string) {
  const catIds = new Set(
    serviceStore.services
      .filter((s) => s.employee_id === employeeId)
      .map((s) => s.category_id),
  );
  return categories.value.filter((c) => catIds.has(c.id));
}

function servicesForCategory(employeeId: string, categoryId: string) {
  return serviceStore.services.filter(
    (s) => s.employee_id === employeeId && s.category_id === categoryId,
  );
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
