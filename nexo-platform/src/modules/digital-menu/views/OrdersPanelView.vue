<template>
  <div>
    <PageHeader title="Panel de Pedidos" subtitle="Gestiona los pedidos en tiempo real" />
    <v-row>
      <v-col
        v-for="col in statusColumns"
        :key="col.status"
        cols="12"
        md="3"
      >
        <v-card :color="col.color" class="pa-4" :title="col.label">
          <v-card-text>
            <p class="text-body-2 text-medium-emphasis">Pedidos {{ col.label }} apareceran aqui</p>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
import PageHeader from '@/shared/components/PageHeader.vue';

const statusColumns = [
  { status: 'pending', label: 'Pendientes', color: 'warning' },
  { status: 'preparing', label: 'Preparando', color: 'info' },
  { status: 'ready', label: 'Listos', color: 'success' },
  { status: 'delivered', label: 'Entregados', color: 'grey' },
];
</script>
