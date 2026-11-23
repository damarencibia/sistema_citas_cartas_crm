<template>
  <nav v-if="crumbs.length" class="app-breadcrumbs">
    <template v-for="(crumb, i) in crumbs" :key="crumb.title">
      <span v-if="i > 0" class="app-breadcrumbs__separator">/</span>
      <span
        v-if="!crumb.isCurrent"
        class="app-breadcrumbs__link"
        role="link"
        tabindex="0"
        @click="router.push(crumb.to)"
        @keydown.enter="router.push(crumb.to)"
      >
        {{ crumb.title }}
      </span>
      <span v-else class="app-breadcrumbs__current">{{ crumb.title }}</span>
    </template>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSidebarModules } from '@/shared/composables/useSidebarModules';

const route = useRoute();
const router = useRouter();
const { getBreadcrumbs } = useSidebarModules();

const crumbs = computed(() => getBreadcrumbs(route));
</script>

<style scoped>
.app-breadcrumbs {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  white-space: nowrap;
}

.app-breadcrumbs__separator {
  color: var(--text-faint);
  font-weight: 400;
}

.app-breadcrumbs__link {
  color: var(--text-muted);
  cursor: pointer;
  transition: color 0.15s ease;
}

.app-breadcrumbs__link:hover {
  color: var(--text-primary);
}

.app-breadcrumbs__current {
  color: var(--text-primary);
  font-weight: 500;
}
</style>
