<template>
  <v-layout>
    <AppSidebar />
    <AppTopbar />
    <v-main>
      <div class="main-content pa-4 pa-md-6">
        <router-view v-slot="{ Component }">
          <transition name="page" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </div>
    </v-main>
  </v-layout>
</template>

<script setup lang="ts">
import AppSidebar from '@/shared/components/AppSidebar.vue';
import AppTopbar from '@/shared/components/AppTopbar.vue';
</script>

<style scoped>
.main-content {
  max-width: 1280px;
  margin: 0 auto;
}

@media (max-width: 768px) {
  .main-content {
    padding: 16px !important;
  }
}
</style>
