<template>
  <div>
    <PageHeader title="Categorias" subtitle="Administra las categorias de tu carta">
      <template #actions>
        <v-btn color="primary">
          <v-icon start>mdi-plus</v-icon>
          Nueva Categoria
        </v-btn>
      </template>
    </PageHeader>
    <v-card class="pa-4">
      <p class="text-body-1 text-medium-emphasis">
        Lista de categorias con drag & drop para reordenar
      </p>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import PageHeader from '@/shared/components/PageHeader.vue';
</script>
