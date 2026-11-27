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
    <v-icon size="20" aria-hidden="true">mdi-menu</v-icon>
    <span class="nav-trigger__label">Menú</span>
  </button>
</template>

<script setup lang="ts">
import { useUiStore } from '@/shared/stores/ui.store';

const uiStore = useUiStore();
</script>

<style scoped>
.nav-trigger {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 44px;
  height: 44px;
  padding: 0 13px;
  border: 1px solid rgb(var(--v-theme-on-surface), 0.12);
  border-radius: 12px;
  background: transparent;
  color: rgb(var(--v-theme-on-surface), 0.78);
  cursor: pointer;
  transition:
    transform 0.15s ease,
    background-color 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;
}

.nav-trigger:hover {
  background: rgb(var(--v-theme-on-surface), 0.06);
  border-color: rgb(var(--v-theme-on-surface), 0.2);
  color: rgb(var(--v-theme-on-surface), 0.94);
}

.nav-trigger:not(:disabled):active {
  transform: scale(0.97);
  background: rgb(var(--v-theme-surface-variant));
}

.nav-trigger:focus-visible {
  outline: 2px solid rgb(var(--v-theme-on-surface));
  outline-offset: 2px;
}

.nav-trigger__label {
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

@media (max-width: 1279px) {
  .nav-trigger {
    padding: 0;
  }

  .nav-trigger__label {
    display: none;
  }
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
