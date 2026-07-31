<template>
  <div>
    <v-container v-if="loading" max-width="900" class="py-16 text-center">
      <v-progress-circular indeterminate color="primary" />
    </v-container>

    <v-container v-else-if="notFound" max-width="600" class="py-16 text-center">
      <h1 class="text-h5 font-weight-bold mb-2">Negocio no encontrado</h1>
      <p class="text-body-1 text-medium-emphasis">Verifica la dirección o contacta al negocio.</p>
    </v-container>

    <v-container v-else max-width="900" class="py-10">
      <div class="text-center mb-10">
        <v-avatar v-if="tenant?.logo_url" :image="tenant.logo_url" size="96" class="mb-4" />
        <v-avatar v-else color="primary" size="96" class="mb-4">
          <span class="text-white text-h4 font-weight-bold">{{ (tenant?.name || 'N')[0] }}</span>
        </v-avatar>
        <h1 class="text-h4 font-weight-bold">{{ tenant?.name }}</h1>
        <p v-if="tenant?.address" class="text-body-1 text-medium-emphasis mt-1">
          <v-icon size="16" class="mr-1">mdi-map-marker</v-icon>{{ tenant.address }}
        </p>
        <p v-if="tenant?.phone" class="text-body-1 text-medium-emphasis">
          <v-icon size="16" class="mr-1">mdi-phone</v-icon>{{ tenant.phone }}
        </p>
        <div class="d-flex justify-center ga-3 mt-6 flex-wrap">
          <v-btn
            v-if="tenant?.modules?.appointments"
            color="primary"
            size="large"
            :to="`/${slug}/booking`"
          >
            <v-icon start>mdi-calendar-check</v-icon>
            Reservar Cita
          </v-btn>
          <v-btn
            v-if="tenant?.modules?.digital_menu"
            variant="outlined"
            size="large"
            :to="`/${slug}/menu`"
          >
            <v-icon start>mdi-menu</v-icon>
            Ver Menú
          </v-btn>
          <v-btn v-if="tenant?.modules?.crm" variant="tonal" size="large" :to="`/${slug}/portal`">
            <v-icon start>mdi-account-heart</v-icon>
            Mi Portal
          </v-btn>
        </div>
      </div>

      <template v-if="tenant?.modules?.appointments && activeServices.length">
        <h2 class="text-h5 font-weight-bold mb-2">Nuestros Servicios</h2>
        <template v-for="group in groupedServices" :key="group.name">
          <div class="d-flex align-center ga-2 mb-2 mt-4">
            <v-icon size="18">{{ group.icon }}</v-icon>
            <span class="text-subtitle-2 font-weight-medium">{{ group.name }}</span>
          </div>
          <v-card
            v-for="svc in group.services"
            :key="svc.id"
            variant="outlined"
            class="mb-2"
            :to="`/${slug}/booking`"
          >
            <v-card-text class="d-flex align-center ga-3">
              <div class="color-dot" :style="{ backgroundColor: svc.color }" />
              <div class="flex-grow-1">
                <div class="text-subtitle-1">{{ svc.name }}</div>
                <div class="text-caption text-medium-emphasis">{{ svc.duration_minutes }} min</div>
              </div>
              <div class="text-subtitle-2">{{ formatPrice(svc.price) }}</div>
            </v-card-text>
          </v-card>
        </template>
      </template>

      <template v-if="tenant?.modules?.appointments && activeEmployees.length">
        <h2 class="text-h5 font-weight-bold mt-10 mb-4">Nuestro Equipo</h2>
        <div class="d-flex flex-wrap ga-3">
          <v-card
            v-for="emp in activeEmployees"
            :key="emp.id"
            variant="outlined"
            class="pa-3 d-flex align-center ga-3"
          >
            <v-avatar :color="emp.color" size="40">
              <span class="text-white text-body-2">{{ initials(emp) }}</span>
            </v-avatar>
            <div>
              <div class="font-weight-medium">{{ emp.first_name }} {{ emp.last_name }}</div>
              <div class="text-caption text-medium-emphasis">
                {{ emp.email || emp.phone || '' }}
              </div>
            </div>
          </v-card>
        </div>
      </template>
    </v-container>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useTenantStore } from '@/shared/stores/tenant.store';
import { useServiceStore } from '../stores/service.store';
import { useEmployeeStore } from '../stores/employee.store';
import { useServiceCategoryStore } from '../stores/service-category.store';
import type { Employee } from '../types/employee.types';

const route = useRoute();
const tenantStore = useTenantStore();
const serviceStore = useServiceStore();
const employeeStore = useEmployeeStore();
const categoryStore = useServiceCategoryStore();

const slug = computed(() => route.params.slug as string);
const tenant = computed(() => tenantStore.tenant);

const loading = ref(false);
const notFound = ref(false);

const activeServices = computed(() => serviceStore.services.filter((s) => s.is_active));
const activeEmployees = computed(() => employeeStore.activeEmployees);

const groupedServices = computed(() => {
  const groups = new Map<
    string,
    { name: string; icon: string; services: typeof activeServices.value }
  >();
  for (const svc of activeServices.value) {
    const name = svc.category_name || 'General';
    if (!groups.has(name)) {
      const icon =
        categoryStore.categories.find((c) => c.id === svc.category_id)?.icon ?? 'mdi-tag-outline';
      groups.set(name, { name, icon, services: [] });
    }
    groups.get(name)!.services.push(svc);
  }
  return Array.from(groups.values());
});

function formatPrice(centavos: number): string {
  return `$${(centavos / 100).toFixed(2)}`;
}

function initials(emp: Employee): string {
  return `${(emp.first_name || '')[0] ?? ''}${(emp.last_name || '')[0] ?? ''}`;
}

onMounted(async () => {
  loading.value = true;
  try {
    const t = await tenantStore.fetchTenantBySlug(slug.value);
    notFound.value = !t;
    if (t) {
      await Promise.all([
        serviceStore.fetchServices(),
        employeeStore.fetchEmployees(),
        categoryStore.fetchCategories(),
      ]);
    }
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.color-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}
</style>
