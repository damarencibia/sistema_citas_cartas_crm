<template>
  <v-app :theme="uiStore.theme">
    <router-view />
    <v-snackbar
      v-model="uiStore.snackbar.visible"
      :color="uiStore.snackbar.color"
      :timeout="timeout"
      location="bottom right"
      variant="flat"
    >
      {{ uiStore.snackbar.message }}
      <template #actions>
        <v-btn
          icon
          variant="text"
          size="x-small"
          aria-label="Cerrar notificación"
          @click="uiStore.snackbar.visible = false"
        >
          <v-icon size="16">mdi-close</v-icon>
        </v-btn>
      </template>
    </v-snackbar>
  </v-app>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useUiStore } from '@/shared/stores/ui.store';

const uiStore = useUiStore();

/**
 * Duración contextual: los errores requieren más lectura que las confirmaciones.
 * Convención: 3s éxito/info · 6s error/warning (doc 11_ui-design-system).
 */
const timeout = computed(() =>
  ['error', 'warning'].includes(uiStore.snackbar.color) ? 6000 : 3000,
);
</script>
