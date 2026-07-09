<template>
  <div>
    <PageHeader
      :title="`Cliente: ${customer.first_name} ${customer.last_name}`"
      subtitle="Perfil completo del cliente"
    />
    <v-row>
      <v-col cols="12" md="4">
        <v-card class="pa-6 text-center">
          <v-avatar size="80" color="primary" class="mb-3">
            <span class="text-h5 text-white">{{ initials }}</span>
          </v-avatar>
          <h3 class="text-h6 font-weight-bold">
            {{ customer.first_name }} {{ customer.last_name }}
          </h3>
          <p class="text-body-2 text-medium-emphasis">{{ customer.email }}</p>
          <p class="text-body-2 text-medium-emphasis">{{ customer.phone }}</p>
          <v-divider class="my-4" />
          <div class="d-flex justify-space-around">
            <div class="text-center">
              <p class="text-h6 font-weight-bold">{{ customer.total_visits || 0 }}</p>
              <p class="text-caption">Visitas</p>
            </div>
            <div class="text-center">
              <p class="text-h6 font-weight-bold">{{ customer.total_spent || 0 }}</p>
              <p class="text-caption">Gastado</p>
            </div>
          </div>
        </v-card>
      </v-col>
      <v-col cols="12" md="8">
        <v-card class="pa-4">
          <p class="text-body-1 text-medium-emphasis">
            Historial del cliente, notas y fidelizacion
          </p>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import PageHeader from '@/shared/components/PageHeader.vue';

const customer = {
  first_name: 'Juan',
  last_name: 'Perez',
  email: 'juan@email.com',
  phone: '+54111234567',
  total_visits: 5,
  total_spent: 25000,
};

const initials = computed(() => `${customer.first_name[0]}${customer.last_name[0]}`.toUpperCase());
</script>
