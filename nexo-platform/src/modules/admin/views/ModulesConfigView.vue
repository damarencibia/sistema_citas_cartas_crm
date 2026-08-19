<template>
  <div>
    <PageHeader title="Módulos" subtitle="Activa o desactiva los módulos de tu negocio" />

    <v-alert
      v-if="saving"
      type="info"
      variant="tonal"
      class="mb-4"
    >
      Guardando cambios...
    </v-alert>
    <v-alert
      v-if="saved"
      type="success"
      variant="tonal"
      class="mb-4"
      closable
    >
      Cambios guardados correctamente
    </v-alert>

    <v-row>
      <v-col
        v-for="mod in availableModules"
        :key="mod.key"
        cols="12"
        md="4"
      >
        <v-card :class="{ 'opacity-50': !mod.active }" class="pa-4">
          <div class="d-flex align-center mb-4">
            <v-avatar
              :color="mod.active ? 'primary' : 'grey'"
              size="48"
              variant="tonal"
              class="mr-3"
            >
              <v-icon size="24">{{ mod.icon }}</v-icon>
            </v-avatar>
            <div>
              <h3 class="text-subtitle-1 font-weight-bold">{{ mod.name }}</h3>
              <p class="text-body-2 text-medium-emphasis">{{ mod.description }}</p>
            </div>
          </div>
          <v-switch
            :model-value="mod.active"
            :label="mod.active ? 'Activo' : 'Inactivo'"
            hide-details
            @update:model-value="toggleModule(mod.key)"
          />
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue';
import { useTenantStore } from '@/shared/stores/tenant.store';
import PageHeader from '@/shared/components/PageHeader.vue';

const tenantStore = useTenantStore();
const saving = ref(false);
const saved = ref(false);

const moduleDefs = [
  {
    key: 'appointments',
    name: 'Sistema de Citas',
    description: 'Gestión de reservas, agenda y servicios',
    icon: 'mdi-calendar-clock',
  },
  {
    key: 'events',
    name: 'Eventos',
    description: 'Eventos con cupo limitado: fechas, capacidad y reservas',
    icon: 'mdi-calendar-star',
  },
  {
    key: 'digital_menu',
    name: 'Carta Digital',
    description: 'Menú digital, pedidos y gestión de mesas',
    icon: 'mdi-menu',
  },
  {
    key: 'crm',
    name: 'CRM',
    description: 'Clientes, fidelización y programa de puntos',
    icon: 'mdi-account-group',
  },
] as const;

type ModuleKey = (typeof moduleDefs)[number]['key'];

const availableModules = reactive<{ key: ModuleKey; name: string; description: string; icon: string; active: boolean }[]>(
  moduleDefs.map((m) => ({ ...m, active: false })),
);

onMounted(() => {
  const modules = tenantStore.activeModules;
  for (const mod of availableModules) {
    mod.active = modules[mod.key] ?? false;
  }
});

async function toggleModule(key: ModuleKey) {
  const mod = availableModules.find((m) => m.key === key);
  if (!mod) return;

  const updated = { ...tenantStore.activeModules, [key]: !mod.active };
  saving.value = true;
  saved.value = false;
  try {
    await tenantStore.updateTenant({ modules: updated } as any);
    mod.active = !mod.active;
    saved.value = true;
    setTimeout(() => (saved.value = false), 3000);
  } catch {
    saved.value = false;
  } finally {
    saving.value = false;
  }
}
</script>
