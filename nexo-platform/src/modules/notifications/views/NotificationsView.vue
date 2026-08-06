<template>
  <div>
    <PageHeader title="Notificaciones" subtitle="Notificaciones de tu agenda y lista de espera" />

    <PushSettingsCard />

    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        <span class="text-body-1">
          {{
            notificationStore.unreadCount > 0
              ? `${notificationStore.unreadCount} sin leer`
              : 'Todo leído'
          }}
        </span>
        <div class="d-flex ga-2">
          <v-btn
            size="small"
            variant="text"
            color="primary"
            :disabled="notificationStore.unreadCount === 0"
            @click="markAllRead"
          >
            <v-icon start size="18">mdi-check-all</v-icon>
            Marcar todas como leídas
          </v-btn>
          <v-btn
            size="small"
            variant="text"
            color="error"
            :disabled="notificationStore.items.length === 0"
            @click="clearAll"
          >
            <v-icon start size="18">mdi-trash-can-outline</v-icon>
            Limpiar
          </v-btn>
        </div>
      </v-card-title>
      <v-divider />

      <div v-if="notificationStore.loading" class="text-center pa-10">
        <v-progress-circular indeterminate color="primary" />
      </div>

      <div
        v-else-if="notificationStore.items.length === 0"
        class="text-center pa-10 text-medium-emphasis"
      >
        No hay notificaciones todavía
      </div>

      <v-list v-else lines="two">
        <SwipeToDelete
          v-for="n in notificationStore.items"
          :key="n.id"
          @delete="notificationStore.remove(n.id)"
        >
          <v-list-item
            :class="{ 'notification-item--unread': !n.is_read }"
            @click="openNotification(n)"
          >
            <template #prepend>
              <v-avatar :color="colorFor(n.type)" variant="tonal" size="40">
                <v-icon :icon="iconFor(n.type)" size="20" />
              </v-avatar>
            </template>
            <v-list-item-title class="text-body-1 font-weight-medium">
              {{ n.title }}
            </v-list-item-title>
            <v-list-item-subtitle class="text-body-2">
              {{ n.body }}
            </v-list-item-subtitle>
            <template #append>
              <div class="d-flex flex-column align-end ga-1">
                <span class="text-caption" style="color: var(--text-faint)">{{
                  timeAgo(n.created_at)
                }}</span>
                <v-icon v-if="!n.is_read" size="12" color="primary">mdi-circle</v-icon>
              </div>
            </template>
          </v-list-item>
        </SwipeToDelete>
      </v-list>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import PageHeader from '@/shared/components/PageHeader.vue';
import PushSettingsCard from '@/shared/components/PushSettingsCard.vue';
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
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `hace ${days} d`;
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

async function markAllRead() {
  await notificationStore.markAllAsRead();
}

async function clearAll() {
  await notificationStore.clearAll();
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
.notification-item--unread {
  background-color: color-mix(in srgb, rgb(var(--v-theme-primary)) 8%, transparent) !important;
}
</style>
