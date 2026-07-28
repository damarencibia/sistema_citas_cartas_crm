<template>
  <div>
    <PageHeader title="Catálogo de Servicios" subtitle="Visualiza los servicios del negocio">
      <template #tabs>
        <v-tabs v-model="tab" color="primary">
          <v-tab value="categories">
            <v-icon start>mdi-shape-outline</v-icon>
            Categorías / Empleados / Servicios
          </v-tab>
          <v-tab value="employees">
            <v-icon start>mdi-account-group-outline</v-icon>
            Empleados / Servicios
          </v-tab>
          <v-tab value="all-services">
            <v-icon start>mdi-content-cut</v-icon>
            Servicios del Negocio
          </v-tab>
        </v-tabs>
      </template>
    </PageHeader>

    <v-tabs-window v-model="tab">
      <v-tabs-window-item value="categories">
        <CategoryEmployeeTree />
      </v-tabs-window-item>

      <v-tabs-window-item value="employees">
        <EmployeeServiceList />
      </v-tabs-window-item>

      <v-tabs-window-item value="all-services">
        <AllServicesList />
      </v-tabs-window-item>
    </v-tabs-window>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import PageHeader from '@/shared/components/PageHeader.vue';
import CategoryEmployeeTree from '../components/CategoryEmployeeTree.vue';
import EmployeeServiceList from '../components/EmployeeServiceList.vue';
import AllServicesList from '../components/AllServicesList.vue';

const tab = ref('categories');
</script>
