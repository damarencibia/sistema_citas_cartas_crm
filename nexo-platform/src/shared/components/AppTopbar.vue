<template>
  <v-app-bar height="48" class="app-topbar" flat>
    <v-spacer />

    <NotificationCenter class="mr-1" />

    <v-btn
      icon
      size="x-small"
      variant="text"
      class="mr-1"
      @click="uiStore.toggleTheme()"
    >
      <v-icon size="18">{{ uiStore.theme === 'light' ? 'mdi-weather-night' : 'mdi-weather-sunny' }}</v-icon>
    </v-btn>

    <v-menu offset-y="4" :close-on-content-click="true">
      <template #activator="{ props }">
        <v-btn
          v-bind="props"
          icon
          size="x-small"
          variant="text"
        >
          <v-avatar size="28" color="primary" variant="flat">
            <span class="text-white font-weight-medium" style="font-size: 11px;">{{ initials }}</span>
          </v-avatar>
        </v-btn>
      </template>
      <v-list
        density="compact"
        nav
        class="py-1"
        style="min-width: 200px;"
      >
        <v-list-item class="px-3 py-2">
          <div class="text-body-2 font-weight-medium">{{ authStore.userName }}</div>
          <div class="text-caption" style="color: var(--text-muted);">{{ authStore.user?.email }}</div>
        </v-list-item>
        <v-divider class="my-1" />
        <v-list-item
          prepend-icon="mdi-cog-outline"
          title="Configuración"
          to="/settings/business"
          class="px-3"
        />
        <v-list-item
          prepend-icon="mdi-logout"
          title="Cerrar Sesión"
          class="px-3"
          @click="handleLogout"
        />
      </v-list>
    </v-menu>

    <v-btn
      icon
      size="small"
      variant="text"
      class="d-md-none ml-1"
      aria-label="Abrir menú"
      @click="uiStore.toggleSidebar()"
    >
      <v-icon size="22">mdi-menu</v-icon>
    </v-btn>
  </v-app-bar>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/shared/stores/auth.store';
import { useUiStore } from '@/shared/stores/ui.store';
import NotificationCenter from '@/modules/notifications/components/NotificationCenter.vue';

const router = useRouter();
const authStore = useAuthStore();
const uiStore = useUiStore();

const initials = computed(() => {
  const user = authStore.user;
  if (!user) return 'N';
  return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
});

async function handleLogout() {
  await authStore.logout();
  router.push('/auth/login');
}
</script>

<style scoped>
.app-topbar {
  border-bottom: 1px solid rgb(var(--v-border)) !important;
  background-color: rgb(var(--v-theme-surface)) !important;
}
</style>
