<template>
  <div class="public-layout">
    <v-container class="py-8" max-width="900">
      <div class="text-center mb-6">
        <h1 class="text-h4 font-weight-bold">{{ tenantStore.tenant?.name || 'Carta Digital' }}</h1>
        <p class="text-body-1 text-medium-emphasis">Explora nuestro menu</p>
      </div>
      <v-card class="pa-6">
        <p class="text-body-1 text-center text-medium-emphasis">
          Carta digital publica - Categorias swipeables con productos
        </p>
      </v-card>
    </v-container>
  </div>
</template>

<script setup lang="ts">
import { useTenantStore } from '@/shared/stores/tenant.store';

const tenantStore = useTenantStore();
</script>
