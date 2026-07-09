<template>
  <div>
    <h3 class="text-h6 font-weight-bold mb-1">{{ title }}</h3>
    <v-divider class="mb-4" />
    <slot />
  </div>
</template>

<script setup lang="ts">
defineProps<{ title: string }>();
</script>
