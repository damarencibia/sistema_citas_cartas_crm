<template>
  <v-app :theme="uiStore.theme">
    <router-view />
    <v-snackbar
      v-model="uiStore.snackbar.visible"
      :color="uiStore.snackbar.color"
      :timeout="3000"
      location="bottom right"
    >
      {{ uiStore.snackbar.message }}
    </v-snackbar>
  </v-app>
</template>

<script setup lang="ts">
import { useUiStore } from '@/shared/stores/ui.store';

const uiStore = useUiStore();
</script>
