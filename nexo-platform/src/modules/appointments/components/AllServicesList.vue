<template>
  <div class="pa-4">
    <div v-if="loading" class="text-center pa-8">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <div v-else-if="services.length === 0" class="text-center pa-8 text-medium-emphasis">
      <v-icon size="48">mdi-content-cut</v-icon>
      <p class="mt-2">No hay servicios registrados</p>
    </div>

    <v-text-field
      v-else
      v-model="search"
      prepend-inner-icon="mdi-magnify"
      label="Buscar servicio..."
      density="compact"
      variant="outlined"
      hide-details
      class="mb-4"
    />

    <v-row v-if="filteredServices.length > 0">
      <v-col
        v-for="svc in filteredServices"
        :key="svc.id"
        cols="12"
        sm="6"
        md="4"
        lg="3"
      >
        <v-card variant="outlined">
          <v-card-text>
            <div class="d-flex align-center ga-2 mb-1">
              <div class="color-dot" :style="{ backgroundColor: svc.color }" />
              <span class="text-subtitle-2 font-weight-medium text-truncate">{{ svc.name }}</span>
            </div>
            <div class="text-caption text-medium-emphasis ml-4">
              <div>{{ svc.duration_minutes }} min · {{ formatPrice(svc.price) }}</div>
              <div v-if="svc.category_name">
                <v-icon size="12">mdi-tag-outline</v-icon>
                {{ svc.category_name }}
              </div>
              <div v-if="svc.employee_name">
                <v-icon size="12">mdi-account</v-icon>
                {{ svc.employee_name }}
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <div v-else class="text-center pa-6 text-medium-emphasis">
      No se encontraron servicios con "{{ search }}"
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useServiceStore } from '../stores/service.store';

const serviceStore = useServiceStore();
const loading = ref(true);
const search = ref('');

const services = computed(() => serviceStore.services);

const filteredServices = computed(() => {
  if (!search.value) return services.value;
  const q = search.value.toLowerCase();
  return services.value.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      (s.category_name && s.category_name.toLowerCase().includes(q)) ||
      (s.employee_name && s.employee_name.toLowerCase().includes(q)),
  );
});

onMounted(async () => {
  loading.value = true;
  await serviceStore.fetchServices();
  loading.value = false;
});

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
}
</style>
