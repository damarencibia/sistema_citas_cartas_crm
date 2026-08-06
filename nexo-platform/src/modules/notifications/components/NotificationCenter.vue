<template>
  <v-menu offset-y="6" :close-on-content-click="false">
    <template #activator="{ props }">
      <v-btn
        v-bind="props"
        icon
        size="x-small"
        variant="text"
        class="mr-1"
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

    <v-card min-width="360" max-width="420" class="notification-center">
      <v-card-title class="d-flex align-center justify-space-between py-2 text-body-1">
        Notificaciones
        <v-btn
          size="x-small"
          variant="text"
          class="text-primary"
          @click="goToAll"
        >
          Ver todas
        </v-btn>
      </v-card-title>
      <v-divider />

      <div v-if="notificationStore.loading" class="text-center pa-6">
        <v-progress-circular indeterminate size="28" color="primary" />
      </div>

      <div
        v-else-if="notificationStore.items.length === 0"
        class="text-center pa-6 text-medium-emphasis"
      >
        No hay notificaciones
      </div>

      <v-list
        v-else
        density="compact"
        max-height="380"
        class="overflow-y-auto pa-1"
      >
        <SwipeToDelete
          v-for="n in notificationStore.items"
          :key="n.id"
          class="mb-1"
          @delete="notificationStore.remove(n.id)"
        >
          <v-list-item
            class="notification-item"
            :class="{ 'notification-item--unread': !n.is_read }"
            rounded="md"
            @click="openNotification(n)"
          >
            <template #prepend>
              <v-icon
                :icon="iconFor(n.type)"
                :color="colorFor(n.type)"
                size="20"
                class="mt-1"
              />
            </template>
            <v-list-item-title class="text-body-2 font-weight-medium">
              {{ n.title }}
            </v-list-item-title>
            <v-list-item-subtitle class="text-caption mt-1">
              {{ n.body }}
            </v-list-item-subtitle>
            <template #append>
              <span class="text-caption" style="color: var(--text-faint)">{{
                timeAgo(n.created_at)
              }}</span>
            </template>
          </v-list-item>
        </SwipeToDelete>
      </v-list>

      <v-divider />
      <v-card-actions class="py-1">
        <v-btn
          size="small"
          variant="text"
          block
          @click="markAllRead"
        >
          Marcar todas como leídas
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-menu>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import SwipeToDelete from '@/shared/components/SwipeToDelete.vue';
import { useNotificationStore } from '../stores/notification.store';
import type { AppNotification, NotificationType } from '../types/notification.types';

const router = useRouter();
const notificationStore = useNotificationStore();

const ICONS: Record<NotificationType, string> = {
  booking_created: 'mdi-calendar-plus',
  booking_pending_approval: 'mdi-calendar-clock',
  waitlist_offer: 'mdi-clock-alert-outline',
};

const COLORS: Record<NotificationType, string> = {
  booking_created: 'primary',
  booking_pending_approval: 'warning',
  waitlist_offer: 'info',
};

function iconFor(type: NotificationType): string {
  return ICONS[type] ?? 'mdi-bell-outline';
}

function colorFor(type: NotificationType): string {
  return COLORS[type] ?? 'primary';
}

function timeAgo(value: string): string {
  const mins = Math.floor((Date.now() - new Date(value).getTime()) / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  return `${days} d`;
}

function routeFor(n: AppNotification): string {
  if (n.type === 'booking_created') return '/appointments/agenda';
  return '/appointments/bookings';
}

async function openNotification(n: AppNotification) {
  if (!n.is_read) {
    await notificationStore.markAsRead(n.id);
  }
  router.push(routeFor(n));
}

function goToAll() {
  router.push('/appointments/notifications');
}

async function markAllRead() {
  await notificationStore.markAllAsRead();
}

onMounted(() => {
  notificationStore.fetch();
  notificationStore.subscribe();
});

onBeforeUnmount(() => {
  notificationStore.unsubscribe();
});
</script>

<style scoped>
.notification-center {
  max-height: 480px;
}

.notification-item--unread {
  background-color: rgb(var(--v-theme-primary)) !important;
  background-color: color-mix(in srgb, rgb(var(--v-theme-primary)) 8%, transparent) !important;
}
</style>
