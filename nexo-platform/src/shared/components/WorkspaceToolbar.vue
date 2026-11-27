<template>
  <header class="wtoolbar">
    <div class="wtoolbar__left">
      <slot name="leading" />
      <h1 class="wtoolbar__title">{{ title }}</h1>
      <span v-if="meta" class="wtoolbar__meta">{{ meta }}</span>
      <slot />
    </div>

    <div class="wtoolbar__right">
      <slot name="tabs" />
      <slot name="actions" />

      <NotificationCenter class="wtoolbar__utility" />

      <v-btn
        icon
        size="small"
        variant="text"
        aria-label="Cambiar tema"
        class="wtoolbar__utility"
        @click="uiStore.toggleTheme()"
      >
        <v-icon size="19">{{ uiStore.theme === 'light' ? 'mdi-weather-night' : 'mdi-weather-sunny' }}</v-icon>
      </v-btn>

      <AccountMenu />
    </div>
  </header>
</template>

<script setup lang="ts">
import { useUiStore } from '@/shared/stores/ui.store';
import NotificationCenter from '@/modules/notifications/components/NotificationCenter.vue';
import AccountMenu from '@/shared/components/AccountMenu.vue';

withDefaults(defineProps<{
  title: string;
  meta?: string;
}>(), {
  meta: '',
});

const uiStore = useUiStore();
</script>

<style scoped>
.wtoolbar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 16px;
  min-height: 56px;
  padding: 6px 28px;
  border-bottom: 1px solid rgb(var(--v-theme-on-surface), 0.12);
  background: rgb(var(--v-theme-surface));
}

.wtoolbar__left {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.wtoolbar__title {
  margin: 0;
  font-size: 16px;
  line-height: 1.3;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: rgb(var(--v-theme-on-surface));
  white-space: nowrap;
}

.wtoolbar__meta {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
  letter-spacing: 0.02em;
  color: rgb(var(--v-theme-on-surface), 0.5);
}

.wtoolbar__right {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
}

.wtoolbar__utility {
  color: rgb(var(--v-theme-on-surface), 0.72);
}

.wtoolbar__utility.v-btn {
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
}

@media (max-width: 1279px) {
  .wtoolbar {
    padding: 6px 18px;
  }
}

@media (max-width: 899px) {
  .wtoolbar {
    min-height: 56px;
    padding: 6px 14px 8px;
    flex-wrap: wrap;
    row-gap: 6px;
  }

  .wtoolbar__title {
    font-size: 15px;
  }

  .wtoolbar__meta {
    display: none;
  }
}

@media (max-width: 599px) {
  .wtoolbar {
    padding: 6px 10px 8px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .wtoolbar__utility.v-btn {
    transition: none !important;
  }
}
</style>
