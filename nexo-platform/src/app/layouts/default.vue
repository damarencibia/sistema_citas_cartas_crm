<template>
  <v-layout>
    <AppSidebar />
    <AppTopbar />
    <NotificationDrawer />
    <PushOptInBanner />
    <PwaInstallBanner />
    <v-main :style="mainStyle" class="app-main">
      <div class="main-content pa-4 pa-md-6">
        <router-view v-slot="{ Component }">
          <transition name="page" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </div>
    </v-main>
    <ConfirmDialog
      :visible="visible"
      :title="title"
      :message="message"
      @confirm="onConfirm"
      @cancel="onCancel"
    />
  </v-layout>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useDisplay } from 'vuetify';
import AppSidebar from '@/shared/components/AppSidebar.vue';
import AppTopbar from '@/shared/components/AppTopbar.vue';
import NotificationDrawer from '@/modules/notifications/components/NotificationDrawer.vue';
import PushOptInBanner from '@/shared/components/PushOptInBanner.vue';
import PwaInstallBanner from '@/shared/components/PwaInstallBanner.vue';
import ConfirmDialog from '@/shared/components/ConfirmDialog.vue';
import { useConfirm } from '@/shared/composables/useConfirm';
import { useUiStore } from '@/shared/stores/ui.store';

const uiStore = useUiStore();
const { smAndDown } = useDisplay();

const isDesktop = computed(() => !smAndDown.value);

const mainStyle = computed(() => {
  if (!isDesktop.value) return {};
  const secondaryWidth = uiStore.secondarySidebarCollapsed ? 0 : 240;
  const toggleSpace = 14 + 40; // margin-left 14px + tamaño del botón de colapso (40px)
  return { paddingLeft: `${60 + secondaryWidth + toggleSpace}px` };
});

const { visible, title, message, onConfirm, onCancel } = useConfirm();
</script>

<style scoped>
.app-main {
  transition: padding-left 0.2s ease;
}

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
