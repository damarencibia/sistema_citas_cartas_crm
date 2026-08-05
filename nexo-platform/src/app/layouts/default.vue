<template>
  <v-layout>
    <AppSidebar />
    <AppTopbar />
    <PushOptInBanner />
    <v-main :class="{ 'app-main--desktop': isDesktop }">
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
import { computed } from 'vue';
import { useDisplay } from 'vuetify';
import AppSidebar from '@/shared/components/AppSidebar.vue';
import AppTopbar from '@/shared/components/AppTopbar.vue';
import PushOptInBanner from '@/shared/components/PushOptInBanner.vue';

const { smAndDown } = useDisplay();
const isDesktop = computed(() => !smAndDown.value);
</script>

<style scoped>
.main-content {
  max-width: 1280px;
  margin: 0 auto;
}

.app-main--desktop {
  padding-left: 60px;
}

@media (max-width: 768px) {
  .main-content {
    padding: 16px !important;
  }
}
</style>
