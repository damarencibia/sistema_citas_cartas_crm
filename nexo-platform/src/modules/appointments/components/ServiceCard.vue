<template>
  <v-card class="service-card" hover @click="emit('select', service)">
    <v-card-text class="d-flex align-center ga-3">
      <div class="color-dot" :style="{ backgroundColor: service.color }" />
      <div class="flex-grow-1">
        <div class="text-subtitle-1 font-weight-medium">{{ service.name }}</div>
        <div class="text-caption text-medium-emphasis">
          {{ service.duration_minutes }} min
          <template v-if="service.category"> &middot; {{ service.category }} </template>
        </div>
      </div>
      <div class="text-subtitle-2">
        {{ formatPrice(service.price) }}
      </div>
      <v-menu>
        <template #activator="{ props: menuProps }">
          <v-btn
            icon="mdi-dots-vertical"
            size="small"
            variant="text"
            v-bind="menuProps"
            @click.stop
          />
        </template>
        <v-list density="compact">
          <v-list-item prepend-icon="mdi-pencil" title="Editar" @click="emit('edit', service)" />
          <v-list-item
            prepend-icon="mdi-delete"
            title="Eliminar"
            class="text-error"
            @click="emit('delete', service)"
          />
        </v-list>
      </v-menu>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import type { Service } from '../types/service.types';

defineProps<{
  service: Service;
}>();

const emit = defineEmits<{
  select: [service: Service];
  edit: [service: Service];
  delete: [service: Service];
}>();

function formatPrice(centavos: number): string {
  return `$${(centavos / 100).toFixed(2)}`;
}
</script>

<style scoped>
.color-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}
</style>
