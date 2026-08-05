<template>
  <v-layout>
    <AppSidebar />
    <AppTopbar />
    <v-main :class="{ 'app-main--desktop': isDesktop }">
      <v-container fluid class="pa-6">
        <router-view />
      </v-container>
    </v-main>
  </v-layout>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useDisplay } from 'vuetify';
import AppSidebar from '@/shared/components/AppSidebar.vue';
import AppTopbar from '@/shared/components/AppTopbar.vue';

const { smAndDown } = useDisplay();
const isDesktop = computed(() => !smAndDown.value);
</script>

<style scoped>
.app-main--desktop {
  padding-left: 60px;
}
</style>
