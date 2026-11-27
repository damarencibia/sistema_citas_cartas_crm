<template>
  <button
    v-if="!uiStore.sidebar"
    type="button"
    class="nav-trigger"
    aria-label="Abrir navegación"
    aria-controls="app-nav"
    :aria-expanded="uiStore.sidebar"
    @click="uiStore.sidebar = true"
  >
    <v-icon size="22" aria-hidden="true">mdi-menu</v-icon>
  </button>
</template>

<script setup lang="ts">
import { useUiStore } from '@/shared/stores/ui.store';

const uiStore = useUiStore();
</script>

<style scoped>
.nav-trigger {
  position: fixed;
  top: 14px;
  left: 14px;
  z-index: 1100;
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgb(var(--v-theme-on-surface), 0.14);
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  box-shadow: 0 2px 10px rgb(var(--v-theme-on-surface), 0.1);
  cursor: pointer;
  transition: transform 0.15s ease, background-color 0.15s ease;
}

.nav-trigger:not(:disabled):active {
  transform: scale(0.94);
  background: rgb(var(--v-theme-surface-variant));
}

.nav-trigger:focus-visible {
  outline: 2px solid rgb(var(--v-theme-on-surface));
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .nav-trigger {
    transition: none;
  }

  .nav-trigger:not(:disabled):active {
    transform: none;
  }
}
</style>
