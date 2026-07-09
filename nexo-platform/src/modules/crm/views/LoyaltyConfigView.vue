<template>
  <div>
    <PageHeader title="Fidelizacion" subtitle="Configura el programa de puntos" />
    <v-card class="pa-6">
      <v-row>
        <v-col cols="12" md="6">
          <v-text-field v-model="config.points_per_visit" label="Puntos por visita" type="number" />
        </v-col>
        <v-col cols="12" md="6">
          <v-text-field
            v-model="config.welcome_points"
            label="Puntos de bienvenida"
            type="number"
          />
        </v-col>
        <v-col cols="12" md="6">
          <v-text-field
            v-model="config.expiry_months"
            label="Meses hasta expiracion"
            type="number"
          />
        </v-col>
        <v-col cols="12">
          <v-switch v-model="config.is_active" label="Activar programa de fidelizacion" />
        </v-col>
      </v-row>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue';
import PageHeader from '@/shared/components/PageHeader.vue';

const config = reactive({
  points_per_visit: 10,
  welcome_points: 50,
  expiry_months: 6,
  is_active: false,
});
</script>
