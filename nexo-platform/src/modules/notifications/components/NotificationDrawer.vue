<template>
  <v-navigation-drawer
    v-model="uiStore.notificationsOpen"
    temporary
    location="right"
    width="400"
    :scrim="false"
    class="notification-drawer"
  >
    <div class="d-flex flex-column h-100">
      <div class="d-flex align-center justify-space-between px-4 py-3">
        <div class="text-body-1 font-weight-medium">Notificaciones</div>
        <v-btn
          icon="mdi-close"
          size="small"
          variant="text"
          aria-label="Cerrar notificaciones"
          @click="uiStore.notificationsOpen = false"
        />
      </div>
      <v-divider />

      <div class="px-4 py-3">
        <div class="d-flex align-center justify-space-between ga-4">
          <div>
            <div class="text-body-2">Recibir notificaciones del navegador</div>
            <div class="text-caption" style="color: var(--text-muted)">
              {{ statusText }}
            </div>
          </div>
          <v-switch
            :model-value="pushStore.isEnabled"
            :disabled="!canToggle || pushStore.enabling || pushStore.checking"
            :loading="pushStore.enabling || pushStore.checking"
            color="primary"
            hide-details
            @update:model-value="onPushToggle"
          />
        </div>
        <v-alert
          v-if="pushStore.error"
          type="error"
          density="compact"
          variant="tonal"
          class="mt-2"
        >
          {{ pushStore.error }}
        </v-alert>
        <v-alert
          v-else-if="permissionDenied"
          type="warning"
          density="compact"
          variant="tonal"
          class="mt-2"
        >
          El permiso está bloqueado en el navegador. Habilítalo desde la configuración del
          sitio para volver a activar las notificaciones.
        </v-alert>
      </div>
      <v-divider />

      <div class="notification-list flex-grow-1 overflow-y-auto">
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
          class="pa-1"
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
      </div>

      <v-divider />
      <div class="pa-3 d-flex flex-column ga-2">
        <v-btn
          v-if="notificationStore.hasMore"
          variant="tonal"
          color="primary"
          block
          :loading="notificationStore.loadingMore"
          @click="notificationStore.fetchMore()"
        >
          <v-icon start size="18">mdi-plus</v-icon>
          Mostrar más
        </v-btn>
        <div class="d-flex ga-2">
          <v-btn
            size="small"
            variant="text"
            block
            :disabled="notificationStore.unreadCount === 0"
            @click="markAllRead"
          >
            Marcar todas como leídas
          </v-btn>
          <v-btn
            size="small"
            variant="text"
            block
            color="error"
            :disabled="notificationStore.items.length === 0"
            @click="clearAll"
          >
            <v-icon start size="18">mdi-trash-can-outline</v-icon>
            Limpiar
          </v-btn>
        </div>
      </div>
    </div>
  </v-navigation-drawer>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import SwipeToDelete from '@/shared/components/SwipeToDelete.vue';
import { usePushStore } from '@/shared/stores/push.store';
import { useUiStore } from '@/shared/stores/ui.store';
import { useNotificationStore } from '../stores/notification.store';
import type { AppNotification, NotificationType } from '../types/notification.types';

const router = useRouter();
const notificationStore = useNotificationStore();
const pushStore = usePushStore();
const uiStore = useUiStore();

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
  uiStore.notificationsOpen = false;
  router.push(routeFor(n));
}

async function markAllRead() {
  await notificationStore.markAllAsRead();
}

async function clearAll() {
  await notificationStore.clearAll();
}

const canToggle = computed(
  () => pushStore.supported && pushStore.configured && !permissionDenied.value,
);

const permissionDenied = computed(() => pushStore.permission === 'denied');

const statusText = computed(() => {
  if (!pushStore.supported) return 'Este navegador no soporta notificaciones push.';
  if (pushStore.checking) return 'Comprobando...';
  if (pushStore.isEnabled) return 'Activadas en este navegador.';
  if (pushStore.permission === 'denied') return 'Bloqueadas en el navegador.';
  if (pushStore.permission === 'granted') return 'Permiso concedido. Actívalas cuando quieras.';
  return 'Desactivadas.';
});

async function onPushToggle(value: boolean | null) {
  if (value === null) return;
  if (value) {
    await pushStore.enable();
  } else {
    await pushStore.disable();
  }
}

onMounted(() => {
  notificationStore.fetch();
  notificationStore.subscribe();
  pushStore.init();
});

onBeforeUnmount(() => {
  notificationStore.unsubscribe();
});
</script>

<style scoped>
.notification-drawer {
  transition-duration: 0.3s !important;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1) !important;
  box-shadow: none !important;
  border-right: none !important;
  border-left: 1px solid rgb(var(--v-border)) !important;
}

.notification-drawer :deep(.v-navigation-drawer__content) {
  overscroll-behavior: contain;
}

.notification-list {
  min-height: 0;
  overscroll-behavior: contain;
}

.notification-item--unread {
  background-color: rgb(var(--v-theme-primary)) !important;
  background-color: color-mix(in srgb, rgb(var(--v-theme-primary)) 8%, transparent) !important;
}
</style>
