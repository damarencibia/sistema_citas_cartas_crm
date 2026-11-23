<template>
  <!-- Vistas "standalone" (ej. LoginScene full-viewport): se montan sin el contenedor v-card -->
  <router-view v-if="isStandalone" />

  <v-layout v-else class="auth-layout">
    <v-main
      class="d-flex align-center justify-center"
      style="min-height: 100vh; background: rgb(var(--v-theme-background))"
    >
      <v-card class="auth-card pa-8" width="480">
        <div class="text-center mb-6">
          <v-avatar color="primary" size="48" variant="flat" rounded="lg">
            <span class="text-white font-weight-bold text-h6">N</span>
          </v-avatar>
          <h1 class="text-h5 font-weight-semibold mt-3">Nexo Platform</h1>
          <p class="text-body-2 mt-1" style="color: var(--text-muted);">
            Sistema de gestión para pymes
          </p>
        </div>
        <router-view />
      </v-card>
    </v-main>
  </v-layout>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const isStandalone = computed(() => route.meta.standalone === true);
</script>

<style scoped>
.auth-card {
  border-radius: 16px !important;
  border: 1px solid rgb(var(--v-border)) !important;
  box-shadow: 0 24px 64px var(--overlay-shadow) !important;
}
</style>
