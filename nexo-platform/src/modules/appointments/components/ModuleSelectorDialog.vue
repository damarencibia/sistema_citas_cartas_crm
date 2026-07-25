<template>
  <v-dialog
    :model-value="modelValue"
    persistent
    width="560"
    no-click-animation
  >
    <template #default>
      <v-card class="pa-6" rounded="xl">
        <div class="text-center mb-6">
          <v-icon size="56" color="primary">mdi-apps</v-icon>
          <h2 class="text-h5 font-weight-bold mt-3">Selecciona un módulo</h2>
          <p class="text-body-2 text-medium-emphasis mt-1">
            Elige el módulo al que deseas acceder
          </p>
        </div>

        <v-row dense>
          <v-col
            v-for="mod in modules"
            :key="mod.id"
            cols="12"
          >
            <v-card
              :variant="selected === mod.id ? 'tonal' : 'outlined'"
              :color="selected === mod.id ? 'primary' : undefined"
              class="module-card d-flex align-center pa-4"
              rounded="lg"
              hover
              :style="{ cursor: 'pointer', transition: 'all 0.2s ease' }"
              @click="selected = mod.id"
              @dblclick="confirm"
            >
              <v-avatar :color="selected === mod.id ? 'primary' : 'grey-lighten-3'" size="56" class="mr-4">
                <v-icon :color="selected === mod.id ? 'white' : 'primary'" size="28">
                  {{ mod.icon }}
                </v-icon>
              </v-avatar>
              <div class="flex-grow-1">
                <div class="text-subtitle-1 font-weight-bold">{{ mod.title }}</div>
                <div class="text-body-2 text-medium-emphasis">{{ mod.description }}</div>
              </div>
              <v-icon
                v-if="selected === mod.id"
                color="primary"
                size="24"
              >
                mdi-check-circle
              </v-icon>
            </v-card>
          </v-col>
        </v-row>

        <v-card-actions class="justify-end mt-4">
          <v-btn
            color="primary"
            variant="flat"
            size="large"
            :disabled="!selected"
            @click="confirm"
          >
            OK
          </v-btn>
        </v-card-actions>
      </v-card>
    </template>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useTenantStore } from '@/shared/stores/tenant.store';

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  select: [moduleId: string];
}>();

const tenantStore = useTenantStore();
const selected = ref<string | null>(null);

const modules = computed(() => {
  const mods = tenantStore.activeModules;
  const list: { id: string; icon: string; title: string; description: string }[] = [];

  if (mods.appointments) {
    list.push({
      id: 'appointments',
      icon: 'mdi-calendar-clock',
      title: 'Sistema de Citas',
      description: 'Agenda, reservas, servicios y gestión de citas',
    });
  }
  if (mods.digital_menu) {
    list.push({
      id: 'digital_menu',
      icon: 'mdi-silverware-fork-knife',
      title: 'Carta Digital',
      description: 'Menú digital, productos, categorías y pedidos',
    });
  }
  if (mods.crm) {
    list.push({
      id: 'crm',
      icon: 'mdi-account-group',
      title: 'CRM',
      description: 'Clientes, etiquetas, fidelización y notas',
    });
  }

  return list;
});

function confirm() {
  if (!selected.value) return;
  emit('select', selected.value);
  emit('update:modelValue', false);
}
</script>

<style scoped>
.module-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}
</style>
