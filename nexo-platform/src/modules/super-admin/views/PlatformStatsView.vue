<template>
  <div>
    <PageHeader title="Estadisticas de la Plataforma" subtitle="Metricas globales del sistema" />
    <v-row>
      <v-col
        v-for="stat in stats"
        :key="stat.title"
        cols="12"
        md="3"
      >
        <v-card class="pa-4 text-center">
          <p class="text-h4 font-weight-bold text-primary">{{ stat.value }}</p>
          <p class="text-body-2 text-medium-emphasis">{{ stat.title }}</p>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
import PageHeader from '@/shared/components/PageHeader.vue';

const stats = [
  { title: 'Total Tenants', value: '0' },
  { title: 'Usuarios Activos', value: '0' },
  { title: 'Citas Totales', value: '0' },
  { title: 'Ingresos', value: '$0' },
];
</script>
