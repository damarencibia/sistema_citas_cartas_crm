<template>
  <div class="d-flex align-center justify-center pa-8">
    <v-progress-circular :size="size" indeterminate color="primary" />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  size?: number;
}>();
</script>
