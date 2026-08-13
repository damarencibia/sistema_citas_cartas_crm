<template>
  <div class="app-sidebar-root">
    <v-navigation-drawer
      v-if="!isDesktop"
      v-model="uiStore.sidebar"
      temporary
      :scrim="true"
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
            :class="{ 'sidebar-item--active': isOptionActive(route, opt), 'sidebar-item--new': opt.action === 'new-booking' }"
            @click="go(opt.to)"
          />
        </v-list>
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
            :class="{ 'sidebar-item--active': isOptionActive(route, opt), 'sidebar-item--new': opt.action === 'new-booking' }"
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
import { useSidebarModules } from '@/shared/composables/useSidebarModules';
import type { SidebarModule } from '@/shared/composables/useSidebarModules';

const authStore = useAuthStore();
const tenantStore = useTenantStore();
const uiStore = useUiStore();
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
  font-weight: 450;
  letter-spacing: 0;
  min-height: 36px;
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
  background-color: rgb(var(--v-theme-primary)) !important;
  color: #fff !important;
  font-weight: 600;
}

.sidebar-item--active .v-icon {
  color: #fff !important;
}

.sidebar-item--new {
  color: rgb(var(--v-theme-primary)) !important;
  font-weight: 600;
  min-height: 40px;
  border: 1px solid rgb(var(--v-theme-primary));
}

.sidebar-item--new .v-icon {
  color: rgb(var(--v-theme-primary)) !important;
}

.desktop-nav {
  position: fixed;
  top: 48px;
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
  margin: 4px 0;
  padding: 0;
  overflow: hidden;
  border-radius: 8px;
  background: rgb(var(--v-theme-surface)) !important;
  border: 1px solid rgb(var(--v-border));
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
  cursor: pointer;
}

.primary-item__icon {
  margin-left: 10px;
  color: rgb(var(--v-theme-on-surface));
}

.primary-item__label {
  flex: 1;
  min-width: 0;
  margin-left: 10px;
  white-space: nowrap;
  font-size: 13px;
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface));
}

.primary-item--active {
  background-color: rgb(var(--v-theme-primary)) !important;
  border-color: rgb(var(--v-theme-primary)) !important;
}

.primary-item--active .primary-item__icon,
.primary-item--active .primary-item__label {
  color: #fff !important;
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
  padding: 12px;
  min-height: 48px;
}

.secondary-header__title {
  font-size: 13px;
  font-weight: 600;
}

.secondary-toggle {
  align-self: flex-start;
  margin-top: 12px;
  margin-left: 14px;
  flex: 0 0 auto;
  border-radius: 50% !important;
  background: rgb(var(--v-theme-surface)) !important;
  border: 1px solid rgb(var(--v-border));
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.secondary-toggle .v-icon {
  color: rgb(var(--v-theme-on-surface));
}
</style>
