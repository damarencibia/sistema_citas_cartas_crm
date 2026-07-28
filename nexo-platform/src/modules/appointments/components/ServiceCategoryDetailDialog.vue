<template>
  <v-dialog
    :model-value="visible"
    max-width="700"
    @update:model-value="emit('close')"
  >
    <v-card>
      <v-card-title class="text-h6 d-flex align-center">
        <v-icon start>{{ category.icon || 'mdi-tag-outline' }}</v-icon>
        {{ category.name }}
        <v-spacer />
        <v-btn icon="mdi-close" size="small" variant="text" @click="emit('close')" />
      </v-card-title>
      <v-card-text>
        <p v-if="category.description" class="text-body-2 text-medium-emphasis mb-4">
          {{ category.description }}
        </p>

        <v-list v-if="groupedEmployees.length > 0" lines="two">
          <template v-for="emp in groupedEmployees" :key="emp.employee.id">
            <v-list-subheader>
              <v-avatar :color="emp.employee.color" size="28" class="mr-2">
                <span class="text-white text-caption">{{ emp.employee.first_name[0] }}{{ emp.employee.last_name[0] }}</span>
              </v-avatar>
              {{ emp.employee.first_name }} {{ emp.employee.last_name }}
            </v-list-subheader>
            <v-list-item
              v-for="service in emp.services"
              :key="service.id"
              :title="service.name"
              :subtitle="`${service.duration_minutes} min · ${formatPrice(service.price)}`"
            >
              <template #prepend>
                <div class="color-dot" :style="{ backgroundColor: service.color }" />
              </template>
            </v-list-item>
          </template>
        </v-list>

        <div v-else class="text-center pa-6 text-medium-emphasis">
          <v-icon size="48">mdi-account-off-outline</v-icon>
          <p class="mt-2">No hay empleados con servicios en esta categoría</p>
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { serviceRepository } from '../repositories/service.repository';
import type { ServiceCategory } from '../types/service-category.types';
import type { Service } from '../types/service.types';
import type { Employee } from '../types/employee.types';

const props = defineProps<{
  visible: boolean;
  category: ServiceCategory;
}>();

const emit = defineEmits<{
  close: [];
}>();

const services = ref<Service[]>([]);

interface EmployeeGroup {
  employee: Employee;
  services: Service[];
}

const groupedEmployees = computed(() => {
  const map = new Map<string, EmployeeGroup>();
  for (const s of services.value) {
    if (!s.employee_id) continue;
    if (!map.has(s.employee_id)) {
      map.set(s.employee_id, {
        employee: {
          id: s.employee_id,
          first_name: s.employee_name?.split(' ')[0] ?? '',
          last_name: s.employee_name?.split(' ').slice(1).join(' ') ?? '',
          color: '#1976D2',
        } as Employee,
        services: [],
      });
    }
    map.get(s.employee_id)!.services.push(s);
  }
  return Array.from(map.values());
});

watch(
  () => props.visible,
  async (v) => {
    if (v) {
      services.value = await serviceRepository.getByCategory(props.category.id);
    }
  },
  { immediate: true },
);

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
