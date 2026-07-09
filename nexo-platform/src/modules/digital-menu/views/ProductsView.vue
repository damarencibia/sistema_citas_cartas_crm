<template>
  <div>
    <PageHeader title="Productos" subtitle="Administra los productos de tu carta">
      <template #actions>
        <v-btn color="primary">
          <v-icon start>mdi-plus</v-icon>
          Nuevo Producto
        </v-btn>
      </template>
    </PageHeader>
    <v-card>
      <DataTable
        :items="products"
        :total="products.length"
        :loading="loading"
        :headers="headers"
      />
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import PageHeader from '@/shared/components/PageHeader.vue';
import DataTable from '@/shared/components/DataTable.vue';

const headers = [
  { title: 'Nombre', key: 'name' },
  { title: 'Categoria', key: 'category_name' },
  { title: 'Precio', key: 'price' },
  { title: 'Disponible', key: 'is_available' },
];

const products: any[] = [];
const loading = ref(false);
</script>
