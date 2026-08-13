<template>
  <div class="page-header mb-6">
    <div class="d-flex align-start justify-space-between ga-4 flex-wrap">
      <div
        v-if="title || subtitle"
        class="page-header__titles"
        :class="{ 'd-sm-none': !alwaysShowTitle }"
      >
        <h1 v-if="title" class="page-header__title">{{ title }}</h1>
        <p v-if="subtitle" class="page-header__subtitle">{{ subtitle }}</p>
      </div>
      <div class="d-flex ga-2 flex-wrap ml-auto">
        <slot name="actions" />
      </div>
    </div>
    <div class="page-header__tabs">
      <slot name="tabs" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title?: string;
  subtitle?: string;
  alwaysShowTitle?: boolean;
}>();
</script>

<style scoped>
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.page-header__title {
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.3;
}

.page-header__subtitle {
  font-size: 13px;
  color: var(--text-muted);
  margin-top: 2px;
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 12px;
  }
}
</style>
