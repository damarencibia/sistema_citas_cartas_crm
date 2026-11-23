<template>
  <div class="empty-state text-center pa-8">
    <div v-if="icon" class="empty-state__icon">
      <v-icon :icon="icon" size="26" />
    </div>
    <div v-if="title" class="empty-state__title">
      {{ title }}
    </div>
    <div v-if="description" class="empty-state__description">
      {{ description }}
    </div>
    <div v-if="$slots.actions" class="mt-5">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title?: string;
  description?: string;
  icon?: string;
}>();
</script>

<style scoped>
.empty-state__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  margin-bottom: 16px;
  border-radius: 50%;
  border: 1px solid rgb(var(--v-border));
  background-color: rgba(var(--v-theme-on-surface), 0.03);
  color: var(--text-muted);
}

.empty-state__title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.empty-state__description {
  max-width: 420px;
  margin: 4px auto 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-muted);
}
</style>
