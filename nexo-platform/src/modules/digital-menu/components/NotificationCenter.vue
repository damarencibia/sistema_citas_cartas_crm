<template>
  <div>
    <v-snackbar
      v-for="notification in notifications"
      :key="notification.id"
      :model-value="true"
      :color="notification.type"
      :timeout="notification.duration || 5000"
      top
      right
      @update:model-value="(v) => !v && removeNotification(notification.id)"
    >
      <div class="d-flex align-center ga-2">
        <div>
          <div class="font-weight-bold">{{ notification.title }}</div>
          <div class="text-caption">{{ notification.message }}</div>
        </div>
        <v-spacer />
        <v-btn
          v-if="notification.dismissible"
          icon
          size="small"
          variant="text"
          @click="removeNotification(notification.id)"
        >
          <v-icon size="small">mdi-close</v-icon>
        </v-btn>
      </div>
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { watch } from 'vue';
import { useNotificationStore } from '../stores/notification.store';
import { useSound } from '../composables/useSound';

const notificationStore = useNotificationStore();
const { playSound } = useSound();
const notifications = notificationStore.notifications;

function removeNotification(id: string) {
  notificationStore.removeNotification(id);
}

// Reproducir sonido cuando se agrega una notificación
watch(
  () => notifications.length,
  () => {
    const lastNotification = notifications[notifications.length - 1];
    if (lastNotification?.sound) {
      playSound(lastNotification.sound);
    }
  }
);
</script>
