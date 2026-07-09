<template>
  <div>
    <PageHeader title="Etiquetas" subtitle="Gestiona las etiquetas para clasificar clientes">
      <template #actions>
        <v-btn color="primary">
          <v-icon start>mdi-plus</v-icon>
          Nueva Etiqueta
        </v-btn>
      </template>
    </PageHeader>
    <v-card class="pa-4">
      <p class="text-body-1 text-medium-emphasis">
        Gestion de etiquetas - CRUD + asignacion automatica
      </p>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import PageHeader from '@/shared/components/PageHeader.vue';
</script>
