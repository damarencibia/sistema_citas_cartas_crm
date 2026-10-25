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
        <v-btn
          icon="mdi-close"
          size="small"
          variant="text"
          @click="emit('close')"
        />
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
import { supabase } from '@/shared/api/supabase.client';
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
const links = ref<{ employee: Employee; service_id: string }[]>([]);

interface EmployeeGroup {
  employee: Employee;
  services: Service[];
}

const groupedEmployees = computed(() => {
  const serviceById = new Map(services.value.map((s) => [s.id, s]));
  const map = new Map<string, EmployeeGroup>();
  for (const link of links.value) {
    const service = serviceById.get(link.service_id);
    if (!service) continue;
    if (!map.has(link.employee.id)) {
      map.set(link.employee.id, {
        employee: link.employee,
        services: [],
      });
    }
    map.get(link.employee.id)!.services.push(service);
  }
  return Array.from(map.values());
});

watch(
  () => props.visible,
  async (v) => {
    if (v) {
      services.value = await serviceRepository.getByCategory(props.category.id);
      // Quién ofrece esos servicios: vinculación employee → servicios
      const serviceIds = services.value.map((s) => s.id);
      if (serviceIds.length) {
        const { data, error } = await (supabase as any)
          .from('employee_services')
          .select('employee:employee_id(*), service_id')
          .in('service_id', serviceIds);
        if (error) throw error;
        links.value = (data ?? [])
          .map((row: any) => ({
            employee: row.employee as Employee,
            service_id: row.service_id as string,
          }))
          .filter(
            (l: { employee: Employee; service_id: string }) =>
              l.employee && !l.employee.deleted_at && l.employee.is_active,
          );
      } else {
        links.value = [];
      }
    } else {
      services.value = [];
      links.value = [];
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
