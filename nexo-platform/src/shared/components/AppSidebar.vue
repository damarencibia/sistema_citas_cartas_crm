<template>
  <div class="app-sidebar-root">
    <v-navigation-drawer
      v-if="!isDesktop || overlay"
      id="app-nav"
      v-model="uiStore.sidebar"
      temporary
      :scrim="true"
      :width="overlay && isDesktop ? 340 : undefined"
      class="app-sidebar app-sidebar--mobile"
    >
      <template #prepend>
        <div class="sidebar-brand--mobile d-flex align-center justify-space-between px-4 py-3">
          <div class="d-flex align-center ga-3 overflow-hidden">
            <v-avatar
              color="primary"
              size="40"
              variant="flat"
              rounded="lg"
            >
              <span class="text-white font-weight-bold" style="font-size: 18px;">{{ tenantInitial }}</span>
            </v-avatar>
            <div class="overflow-hidden">
              <div class="text-h6 font-weight-semibold text-truncate" style="line-height: 1.2;">
                {{ tenantStore.tenant?.name || 'Nexo' }}
              </div>
              <div class="text-caption" style="color: var(--text-faint); line-height: 1.2;">
                {{ authStore.userRole }}
              </div>
            </div>
          </div>
          <v-btn
            icon
            variant="text"
            class="sidebar-close-btn"
            aria-label="Cerrar menú"
            @click="uiStore.sidebar = false"
          >
            <v-icon size="28">mdi-menu-open</v-icon>
          </v-btn>
        </div>
      </template>

      <v-divider class="mx-3" />

      <v-list
        v-if="mobileView === 'modules'"
        density="comfortable"
        nav
        class="pa-2"
      >
        <v-list-item
          v-for="mod in modules"
          :key="mod.key"
          :prepend-icon="mod.icon"
          :title="mod.title"
          :append-icon="mod.options.length ? 'mdi-chevron-right' : undefined"
          rounded="lg"
          class="sidebar-item mb-1"
          @click="onMobileModuleClick(mod)"
        />
      </v-list>

      <template v-else>
        <div class="d-flex align-center ga-1 px-2 py-2">
          <v-btn
            icon
            variant="text"
            size="small"
            aria-label="Volver a módulos"
            @click="mobileView = 'modules'"
          >
            <v-icon>mdi-chevron-left</v-icon>
          </v-btn>
          <span class="text-body-1 font-weight-semibold text-truncate">{{ activeMobileModule?.title }}</span>
        </div>
        <v-divider class="mx-3" />
        <v-list
          density="comfortable"
          nav
          class="pa-2"
        >
          <v-list-item
            v-for="opt in activeMobileModule?.options ?? []"
            :key="opt.title"
            :prepend-icon="opt.icon"
            :title="opt.title"
            rounded="lg"
            class="sidebar-item mb-1"
            :class="{ 'sidebar-item--active': isOptionActive(route, opt) }"
            @click="go(opt.to)"
          />
        </v-list>
      </template>

      <template #append>
        <div class="sidebar-footer">
          <v-divider />
          <div v-if="workspaceStore.canSwitch" class="sidebar-footer__modes">
            <v-btn-toggle
              :model-value="workspaceStore.mode"
              mandatory
              density="compact"
              rounded="lg"
              color="primary"
              class="w-100"
              @update:model-value="onModeChange($event as WorkspaceMode)"
            >
              <v-btn value="work" size="small" class="text-none flex-grow-1">
                <v-icon start size="14">mdi-account-hard-hat</v-icon>
                Trabajo
              </v-btn>
              <v-btn value="admin" size="small" class="text-none flex-grow-1">
                <v-icon start size="14">mdi-shield-crown-outline</v-icon>
                Admin
              </v-btn>
            </v-btn-toggle>
          </div>
          <v-list density="compact" nav class="pa-2">
            <v-list-item
              :prepend-icon="uiStore.theme === 'light' ? 'mdi-weather-night' : 'mdi-weather-sunny'"
              :title="uiStore.theme === 'light' ? 'Tema oscuro' : 'Tema claro'"
              rounded="md"
              @click="uiStore.toggleTheme()"
            />
            <v-list-item
              prepend-icon="mdi-account-circle-outline"
              title="Mi Cuenta"
              to="/settings/account"
              rounded="md"
            />
            <v-list-item
              prepend-icon="mdi-logout"
              title="Cerrar sesión"
              rounded="md"
              @click="handleLogout"
            />
          </v-list>
        </div>
      </template>
    </v-navigation-drawer>

    <div v-else class="desktop-nav">
      <nav
        class="desktop-nav__primary"
        :class="{ 'is-expanded': primaryExpanded }"
        @mouseenter="primaryExpanded = true"
        @mouseleave="primaryExpanded = false"
      >
        <div class="primary-items">
          <div
            v-for="mod in modules"
            :key="mod.key"
            class="primary-item"
            :class="{ 'primary-item--active': mod.key === activeModuleKey }"
            :title="mod.title"
            role="button"
            tabindex="0"
            @click="go(mod.to)"
            @keydown.enter="go(mod.to)"
          >
            <v-icon size="20" class="primary-item__icon">{{ mod.icon }}</v-icon>
            <span class="primary-item__label text-truncate">{{ mod.title }}</span>
          </div>
        </div>
      </nav>

      <nav
        v-if="activeModule?.options.length"
        class="desktop-nav__secondary"
        :class="{ 'is-collapsed': uiStore.secondarySidebarCollapsed }"
      >
        <div class="secondary-header">
          <span class="secondary-header__title text-truncate">{{ activeModule.title }}</span>
        </div>
        <v-divider class="mx-3" />
        <v-list density="compact" nav class="pa-2">
          <v-list-item
            v-for="opt in activeModule.options"
            :key="opt.title"
            :prepend-icon="opt.icon"
            :title="opt.title"
            rounded="md"
            color="primary"
            class="sidebar-item mb-1"
            :class="{ 'sidebar-item--active': isOptionActive(route, opt) }"
            @click="go(opt.to)"
          />
        </v-list>
      </nav>

      <v-btn
        v-if="activeModule?.options.length"
        class="secondary-toggle"
        :class="{ 'is-collapsed': uiStore.secondarySidebarCollapsed }"
        icon
        size="small"
        variant="flat"
        :title="uiStore.secondarySidebarCollapsed ? 'Expandir menú' : 'Colapsar menú'"
        @click="uiStore.toggleSecondarySidebar()"
      >
        <v-icon size="20">{{ uiStore.secondarySidebarCollapsed ? 'mdi-menu-right' : 'mdi-menu-left' }}</v-icon>
      </v-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useDisplay } from 'vuetify';
import { useAuthStore } from '@/shared/stores/auth.store';
import { useTenantStore } from '@/shared/stores/tenant.store';
import { useUiStore } from '@/shared/stores/ui.store';
import { useWorkspaceStore } from '@/shared/stores/workspace.store';
import type { WorkspaceMode } from '@/shared/stores/workspace.store';
import { useSidebarModules } from '@/shared/composables/useSidebarModules';
import type { SidebarModule } from '@/shared/composables/useSidebarModules';

const props = defineProps<{
  /** Modo inmersivo: la navegación se muestra como drawer superpuesto en cualquier tamaño */
  overlay?: boolean;
}>();

const authStore = useAuthStore();
const tenantStore = useTenantStore();
const uiStore = useUiStore();
const workspaceStore = useWorkspaceStore();
const route = useRoute();
const router = useRouter();
const { smAndDown } = useDisplay();

const tenantInitial = computed(() => {
  const name = tenantStore.tenant?.name?.trim();
  return name ? name.charAt(0).toUpperCase() : 'N';
});

const isDesktop = computed(() => !smAndDown.value);
const primaryExpanded = ref(false);
const mobileView = ref<'modules' | string>('modules');

const { modules, routeToModuleKey, isOptionActive } = useSidebarModules();

const activeModuleKey = computed(() => routeToModuleKey(route));
const activeModule = computed(() => modules.value.find((m) => m.key === activeModuleKey.value));
const activeMobileModule = computed<SidebarModule | undefined>(() => modules.value.find((m) => m.key === mobileView.value));

function go(to: string) {
  if (!isDesktop.value) {
    uiStore.sidebar = false;
    mobileView.value = 'modules';
  }
  router.push(to);
}

function onMobileModuleClick(mod: SidebarModule) {
  if (mod.options.length > 0) {
    mobileView.value = mod.key;
  } else {
    go(mod.to);
  }
}

function onModeChange(mode: WorkspaceMode) {
  if (mode === workspaceStore.mode) return;
  workspaceStore.setMode(mode);
  uiStore.sidebar = false;
  const required = route.meta.workspace as string | undefined;
  if (required && required !== mode) {
    router.push(
      mode === 'work'
        ? { path: '/appointments/agenda', query: { tab: 'reservas' } }
        : { path: '/' },
    );
  }
}

async function handleLogout() {
  await authStore.logout();
  uiStore.sidebar = false;
  router.push('/auth/login');
}

watch(() => route.fullPath, () => {
  if (props.overlay) uiStore.sidebar = false;
});

watch(() => uiStore.sidebar, (open) => {
  if (!open) return;
  const mod = activeModule.value;
  mobileView.value = mod && mod.options.length ? mod.key : 'modules';
});

watch(isDesktop, (val) => {
  if (val) primaryExpanded.value = false;
  if (!val) mobileView.value = 'modules';
});
</script>

<style scoped>
.app-sidebar {
  border-right: 1px solid rgb(var(--v-border)) !important;
  background-color: rgb(var(--v-theme-surface)) !important;
}

@media (max-width: 959.98px) {
  .app-sidebar {
    width: 100% !important;
  }

  .app-sidebar:not(.v-navigation-drawer--active) {
    transform: translateX(-100%) !important;
  }
}

.sidebar-item {
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0;
  min-height: 36px;
  color: var(--text-muted);
  transition: background-color 0.15s ease, color 0.15s ease;
}

.app-sidebar--mobile .sidebar-item {
  font-size: 15px;
  font-weight: 500;
  letter-spacing: 0;
  min-height: 48px;
  padding-left: 14px !important;
  padding-right: 14px !important;
}

.app-sidebar--mobile :deep(.v-list-item__prepend > .v-icon) {
  font-size: 26px;
}

.sidebar-item--active {
  background-color: rgba(var(--v-theme-primary), 0.1) !important;
  color: rgb(var(--v-theme-primary)) !important;
  font-weight: 600;
}

.sidebar-item--active .v-icon {
  color: rgb(var(--v-theme-primary)) !important;
}

.desktop-nav {
  position: fixed;
  top: 56px;
  left: 0;
  bottom: 0;
  z-index: 1000;
  display: flex;
  flex-direction: row;
  align-items: stretch;
}

.desktop-nav__primary {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  width: 60px;
  z-index: 20;
  background: rgb(var(--v-theme-surface));
  border-right: 1px solid rgb(var(--v-border));
  transition: width 0.2s ease;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.desktop-nav__primary.is-expanded {
  width: 240px;
}

.primary-items {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0 10px;
}

.primary-items .primary-item:first-child {
  margin-top: 16px;
}

.primary-item {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  height: 40px;
  margin: 2px 0;
  padding: 0;
  overflow: hidden;
  border-radius: 10px;
  background: transparent !important;
  border: none;
  box-shadow: none;
  color: var(--text-muted);
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.primary-item:hover {
  background: rgba(var(--v-theme-on-surface), 0.05) !important;
  color: rgb(var(--v-theme-on-surface));
}

.primary-item__icon {
  margin-left: 8px;
  color: inherit;
  transition: color 0.15s ease;
}

.primary-item__label {
  flex: 1;
  min-width: 0;
  margin-left: 10px;
  white-space: nowrap;
  font-size: 13px;
  font-weight: 500;
  color: inherit;
}

.primary-item--active {
  background-color: rgba(var(--v-theme-primary), 0.1) !important;
}

.primary-item--active,
.primary-item--active .primary-item__icon,
.primary-item--active .primary-item__label {
  color: rgb(var(--v-theme-primary)) !important;
}

.desktop-nav__secondary {
  margin-left: 60px;
  flex: 0 0 auto;
  align-self: stretch;
  width: 240px;
  background: rgb(var(--v-theme-surface));
  border-right: 1px solid rgb(var(--v-border));
  transition: width 0.2s ease;
  overflow: hidden;
}

.desktop-nav__secondary.is-collapsed {
  width: 0;
}

.secondary-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 16px 8px;
  min-height: 44px;
}

.secondary-header__title {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.secondary-toggle {
  align-self: flex-start;
  margin-top: 12px;
  margin-left: 14px;
  flex: 0 0 auto;
  border-radius: 50% !important;
  background: rgb(var(--v-theme-surface)) !important;
  border: 1px solid rgb(var(--v-border));
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.secondary-toggle .v-icon {
  color: var(--text-muted);
}

/* ═══ Footer del drawer (modo overlay / móvil) ═══ */
.sidebar-footer {
  padding-bottom: env(safe-area-inset-bottom, 0);
  background: rgb(var(--v-theme-surface));
}

.sidebar-footer__modes {
  padding: 10px 10px 0;
}

.sidebar-footer__modes :deep(.v-btn) {
  min-height: 44px;
}
</style>
