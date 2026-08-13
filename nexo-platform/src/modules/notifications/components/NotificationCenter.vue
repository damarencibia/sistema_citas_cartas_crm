<template>
  <v-btn
    icon
    size="x-small"
    variant="text"
    class="mr-1"
    aria-label="Notificaciones"
    @click="uiStore.notificationsOpen = !uiStore.notificationsOpen"
  >
    <v-badge
      :content="notificationStore.unreadCount"
      color="error"
      :model-value="notificationStore.hasUnread"
      offset-x="2"
      offset-y="2"
      max="99"
    >
      <v-icon size="18">mdi-bell-outline</v-icon>
    </v-badge>
  </v-btn>
</template>

<script setup lang="ts">
import { useUiStore } from '@/shared/stores/ui.store';
import { useNotificationStore } from '../stores/notification.store';

const uiStore = useUiStore();
const notificationStore = useNotificationStore();
</script>
