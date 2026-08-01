<template>
  <div>
    <PageHeader title="Catálogo y Servicios" subtitle="Visualiza y administra los servicios del negocio">
      <template #tabs>
        <v-tabs v-model="tab" color="primary">
          <v-tab value="catalog">
            <v-icon start>mdi-book-open-outline</v-icon>
            Catálogo
          </v-tab>
          <v-tab value="services">
            <v-icon start>mdi-content-cut</v-icon>
            Servicios
          </v-tab>
          <v-tab value="categories">
            <v-icon start>mdi-shape-outline</v-icon>
            Categorías
          </v-tab>
        </v-tabs>
      </template>
      <template #actions>
        <v-btn v-if="tab === 'services'" color="primary" @click="servicesTab?.openCreate()">
          <v-icon start>mdi-plus</v-icon>
          Nuevo Servicio
        </v-btn>
        <v-btn v-else-if="tab === 'categories'" color="primary" @click="categoriesTab?.openCreate()">
          <v-icon start>mdi-plus</v-icon>
          Nueva Categoría
        </v-btn>
      </template>
    </PageHeader>

    <v-tabs-window v-model="tab">
      <v-tabs-window-item value="catalog">
        <v-tabs v-model="catalogTab" color="primary" density="compact">
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

        <v-tabs-window v-model="catalogTab">
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
      </v-tabs-window-item>

      <v-tabs-window-item value="services">
        <ServicesTab ref="servicesTab" />
      </v-tabs-window-item>

      <v-tabs-window-item value="categories">
        <CategoriesTab ref="categoriesTab" />
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
import ServicesTab from '../components/ServicesTab.vue';
import CategoriesTab from '../components/CategoriesTab.vue';

const tab = ref('catalog');
const catalogTab = ref('categories');
const servicesTab = ref<{ openCreate: () => void } | null>(null);
const categoriesTab = ref<{ openCreate: () => void } | null>(null);
</script>
