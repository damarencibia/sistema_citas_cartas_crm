<template>
  <div class="empty-state text-center pa-6">
    <v-icon
      v-if="icon"
      :icon="icon"
      size="48"
      class="mb-3"
      style="color: var(--text-faint);"
    />
    <div v-if="title" class="text-subtitle-1 font-weight-medium mb-1" style="color: var(--text-muted);">
      {{ title }}
    </div>
    <div v-if="description" class="text-body-2" style="color: var(--text-faint);">
      {{ description }}
    </div>
    <div v-if="$slots.actions" class="mt-4">
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
.empty-state {
  opacity: 0.8;
}
</style>
