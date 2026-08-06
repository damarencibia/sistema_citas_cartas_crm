<template>
  <v-card class="mb-4">
    <v-card-title class="d-flex align-center text-body-1 font-weight-medium">
      <v-icon start size="20">mdi-bell-ring-outline</v-icon>
      Notificaciones del navegador
    </v-card-title>
    <v-divider />
    <v-card-text class="pt-4">
      <div class="d-flex align-center justify-space-between ga-4">
        <div>
          <div class="text-body-2">Recibir notificaciones del navegador</div>
          <div class="text-caption" style="color: var(--text-muted)">
            {{ statusText }}
          </div>
        </div>
        <v-switch
          :model-value="pushStore.isEnabled"
          :disabled="!canToggle || pushStore.enabling || pushStore.checking"
          :loading="pushStore.enabling || pushStore.checking"
          color="primary"
          hide-details
          @update:model-value="onToggle"
        />
      </div>

      <v-alert
        v-if="pushStore.error"
        type="error"
        density="compact"
        variant="tonal"
        class="mt-3"
      >
        {{ pushStore.error }}
      </v-alert>
      <v-alert
        v-else-if="permissionDenied"
        type="warning"
        density="compact"
        variant="tonal"
        class="mt-3"
      >
        El permiso está bloqueado en el navegador. Habilítalo desde la configuración del
        sitio para volver a activar las notificaciones.
      </v-alert>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { usePushStore } from '@/shared/stores/push.store';

const pushStore = usePushStore();

const canToggle = computed(
  () => pushStore.supported && pushStore.configured && !permissionDenied.value,
);

const permissionDenied = computed(() => pushStore.permission === 'denied');

const statusText = computed(() => {
  if (!pushStore.supported) return 'Este navegador no soporta notificaciones push.';
  if (pushStore.checking) return 'Comprobando...';
  if (pushStore.isEnabled) return 'Activadas en este navegador.';
  if (pushStore.permission === 'denied') return 'Bloqueadas en el navegador.';
  if (pushStore.permission === 'granted') return 'Permiso concedido. Actívalas cuando quieras.';
  return 'Desactivadas.';
});

async function onToggle(value: boolean | null) {
  if (value === null) return;
  if (value) {
    await pushStore.enable();
  } else {
    await pushStore.disable();
  }
}

onMounted(() => {
  pushStore.init();
});
</script>
