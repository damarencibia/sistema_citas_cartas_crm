<template>
  <div>
    <PageHeader title="Agenda" subtitle="Gestiona las citas del dia">
      <template #actions>
        <v-btn color="primary" @click="showCreateDialog = true">
          <v-icon start>mdi-plus</v-icon>
          Nueva Cita
        </v-btn>
      </template>
    </PageHeader>
    <v-card class="pa-4">
      <p class="text-body-1 text-medium-emphasis">Calendario de agenda - Vista dia/semana/mes</p>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import PageHeader from '@/shared/components/PageHeader.vue';

const showCreateDialog = ref(false);
</script>
