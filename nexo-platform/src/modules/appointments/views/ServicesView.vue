<template>
  <div>
    <PageHeader title="Servicios" subtitle="Administra los servicios que ofreces">
      <template #actions>
        <v-btn color="primary" @click="openCreate">
          <v-icon start>mdi-plus</v-icon>
          Nuevo Servicio
        </v-btn>
      </template>
    </PageHeader>

    <div v-if="serviceStore.loading" class="text-center pa-8">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <div v-else-if="serviceStore.services.length === 0" class="text-center pa-8">
      <v-icon size="64" color="medium-emphasis">mdi-tag-outline</v-icon>
      <p class="text-body-1 text-medium-emphasis mt-4">No hay servicios configurados</p>
      <v-btn
        color="primary"
        variant="flat"
        class="mt-4"
        @click="openCreate"
      >
        Crear Primer Servicio
      </v-btn>
    </div>

    <v-row v-else>
      <v-col
        v-for="service in serviceStore.services"
        :key="service.id"
        cols="12"
        sm="6"
        md="4"
      >
        <ServiceCard
          :service="service"
          @edit="openEdit"
          @delete="onDelete"
        />
      </v-col>
    </v-row>

    <ServiceForm
      :visible="showForm"
      :service="editingService"
      @close="closeForm"
      @save="onSave"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import PageHeader from '@/shared/components/PageHeader.vue';
import { useNotification } from '@/shared/composables/useNotification';
import { useConfirm } from '@/shared/composables/useConfirm';
import { useServiceStore } from '../stores/service.store';
import ServiceCard from '../components/ServiceCard.vue';
import ServiceForm from '../components/ServiceForm.vue';
import type { Service, CreateServiceDTO } from '../types/service.types';

const serviceStore = useServiceStore();
const notification = useNotification();
const { confirm } = useConfirm();

const showForm = ref(false);
const editingService = ref<Service | null>(null);

onMounted(() => {
  serviceStore.fetchServices();
});

function openCreate() {
  editingService.value = null;
  showForm.value = true;
}

function openEdit(service: Service) {
  editingService.value = service;
  showForm.value = true;
}

function closeForm() {
  showForm.value = false;
  editingService.value = null;
}

async function onSave(dto: CreateServiceDTO) {
  try {
    if (editingService.value) {
      await serviceStore.updateService(editingService.value.id, dto);
      notification.success('Servicio actualizado');
    } else {
      await serviceStore.createService(dto);
      notification.success('Servicio creado');
    }
    closeForm();
  } catch {
    notification.error('Error al guardar servicio');
  }
}

async function onDelete(service: Service) {
  const ok = await confirm(`¿Eliminar el servicio "${service.name}"?`);
  if (!ok) return;
  try {
    await serviceStore.deleteService(service.id);
    notification.success('Servicio eliminado');
  } catch {
    notification.error('Error al eliminar servicio');
  }
}
</script>
