<template>
  <v-app-bar height="48" class="app-topbar" flat>
    <div class="d-flex align-center ga-2" style="min-width: 0; margin-left: 18px;">
      <v-avatar
        color="primary"
        size="24"
        variant="flat"
        rounded="lg"
      >
        <span class="text-white font-weight-bold text-caption">{{ tenantInitial }}</span>
      </v-avatar>
      <span class="text-body-2 font-weight-semibold text-truncate d-none d-sm-inline">{{ tenantStore.tenant?.name || 'Nexo' }}</span>
      <AppBreadcrumbs class="d-none d-sm-flex ml-6" />
    </div>

    <v-spacer />

    <v-btn-toggle
      v-if="workspaceStore.canSwitch"
      :model-value="workspaceStore.mode"
      mandatory
      density="comfortable"
      rounded="pill"
      class="mr-2 workspace-toggle"
      :color="workspaceStore.isWorkMode ? 'teal' : 'primary'"
      @update:model-value="onModeChange"
    >
      <v-btn value="work" size="small" class="text-none">
        <v-icon start size="14">mdi-account-hard-hat</v-icon>
        <span class="d-none d-md-inline">Modo Trabajo</span>
      </v-btn>
      <v-btn value="admin" size="small" class="text-none">
        <v-icon start size="14">mdi-shield-crown-outline</v-icon>
        <span class="d-none d-md-inline">Modo Admin</span>
      </v-btn>
    </v-btn-toggle>

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
          prepend-icon="mdi-account-circle-outline"
          title="Mi Cuenta"
          subtitle="Cambiar contraseña"
          to="/settings/account"
          class="px-3"
        />
        <v-list-item
          v-if="authStore.isAdmin"
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
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/shared/stores/auth.store';
import { useTenantStore } from '@/shared/stores/tenant.store';
import { useUiStore } from '@/shared/stores/ui.store';
import { useWorkspaceStore } from '@/shared/stores/workspace.store';
import type { WorkspaceMode } from '@/shared/stores/workspace.store';
import NotificationCenter from '@/modules/notifications/components/NotificationCenter.vue';
import AppBreadcrumbs from '@/shared/components/AppBreadcrumbs.vue';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const tenantStore = useTenantStore();
const uiStore = useUiStore();
const workspaceStore = useWorkspaceStore();

/**
 * Cambio de espacio de trabajo: si la vista actual pertenece al otro
 * espacio (meta.workspace), redirigimos al inicio del nuevo modo.
 * Las rutas compartidas (agenda, Mi Cuenta) no se mueven.
 */
function onModeChange(mode: WorkspaceMode) {
  if (mode === workspaceStore.mode) return;
  workspaceStore.setMode(mode);
  const required = route.meta.workspace as string | undefined;
  if (required && required !== mode) {
    router.push(mode === 'work' ? { path: '/appointments/agenda', query: { tab: 'reservas' } } : { path: '/' });
  }
}

const tenantInitial = computed(() => {
  const name = tenantStore.tenant?.name?.trim();
  return name ? name.charAt(0).toUpperCase() : 'N';
});

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
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  width: auto !important;
  z-index: 1000 !important;
  border-bottom: 1px solid rgb(var(--v-border-strong)) !important;
  background-color: rgb(var(--v-theme-surface)) !important;
}
</style>
