<template>
  <v-navigation-drawer
    v-model="uiStore.sidebar"
    :temporary="!isDesktop"
    :rail="rail"
    :expand-on-hover="isDesktop"
    :width="240"
    :rail-width="60"
    :scrim="!isDesktop"
    :disable-route-watcher="isDesktop"
    class="app-sidebar"
    :class="{ 'app-sidebar--mobile': !isDesktop }"
    @update:rail="onRailUpdate"
  >
    <template #prepend>
      <div v-if="!isDesktop" class="sidebar-brand--mobile d-flex align-center justify-space-between px-4 py-3">
        <div class="d-flex align-center ga-3 overflow-hidden">
          <v-avatar
            color="primary"
            size="40"
            variant="flat"
            rounded="lg"
          >
            <span class="text-white font-weight-bold" style="font-size: 18px;">N</span>
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

      <div v-else class="sidebar-brand d-flex align-center pa-3" :class="rail ? 'justify-center' : 'justify-space-between'">
        <template v-if="!rail">
          <div class="d-flex align-center ga-2 overflow-hidden">
            <v-avatar color="primary" size="32" variant="flat">
              <span class="text-white font-weight-bold text-body-2">N</span>
            </v-avatar>
            <div class="overflow-hidden">
              <div class="text-body-2 font-weight-semibold text-truncate" style="line-height: 1.2;">
                {{ tenantStore.tenant?.name || 'Nexo' }}
              </div>
              <div class="text-caption" style="color: var(--text-faint); line-height: 1.2;">
                {{ authStore.userRole }}
              </div>
            </div>
          </div>
        </template>
        <v-avatar
          v-else
          color="primary"
          size="32"
          variant="flat"
        >
          <span class="text-white font-weight-bold text-body-2">N</span>
        </v-avatar>
      </div>
    </template>

    <v-divider class="mx-3" />

    <v-list
      v-if="isDesktop"
      density="compact"
      nav
      class="pa-2"
    >
      <template v-for="item in navItems" :key="item.title">
        <v-list-item
          v-if="!item.children"
          :to="item.to"
          :prepend-icon="item.icon"
          :title="item.title"
          :value="item.title"
          color="primary"
          rounded="md"
          class="sidebar-item mb-1"
          :class="{ 'sidebar-item--active': isActive(item.to) }"
        />
        <v-list-group v-else :value="item.title" :prepend-icon="item.icon">
          <template #activator="{ props }">
            <v-list-item
              v-bind="props"
              :title="item.title"
              rounded="md"
              class="sidebar-item mb-1"
            />
          </template>
          <v-list-item
            v-for="child in item.children"
            :key="child.title"
            :to="child.to"
            :prepend-icon="child.icon"
            :title="child.title"
            color="primary"
            rounded="md"
            class="sidebar-item sidebar-item--child mb-1"
          />
        </v-list-group>
      </template>
    </v-list>

    <v-list
      v-else
      density="comfortable"
      nav
      class="pa-2"
    >
      <template v-for="(item, index) in navItems" :key="item.title">
        <v-divider
          v-if="index > 0 && item.section !== navItems[index - 1].section"
          class="mx-3 my-1 sidebar-section-divider"
        />
        <div
          v-if="index === 0 || item.section !== navItems[index - 1].section"
          class="sidebar-section-header px-4"
        >
          {{ item.section }}
        </div>
        <v-list-item
          v-if="!item.children"
          :to="item.to"
          :prepend-icon="item.icon"
          :title="item.title"
          :value="item.title"
          color="primary"
          rounded="lg"
          class="sidebar-item mb-1"
          :class="{ 'sidebar-item--active': isActive(item.to) }"
        />
        <template v-else>
          <v-list-item
            v-for="child in item.children"
            :key="child.title"
            :to="child.to"
            :prepend-icon="child.icon"
            :title="child.title"
            :value="child.title"
            color="primary"
            rounded="lg"
            class="sidebar-item sidebar-item--child mb-1"
            :class="{ 'sidebar-item--active': isActive(child.to) }"
          />
        </template>
      </template>
    </v-list>
  </v-navigation-drawer>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useDisplay } from 'vuetify';
import { useAuthStore } from '@/shared/stores/auth.store';
import { useTenantStore } from '@/shared/stores/tenant.store';
import { useUiStore } from '@/shared/stores/ui.store';

const authStore = useAuthStore();
const tenantStore = useTenantStore();
const uiStore = useUiStore();
const route = useRoute();
const { smAndDown } = useDisplay();

const isDesktop = computed(() => !smAndDown.value);
const isRail = ref(true);
const rail = computed(() => (isDesktop.value ? isRail.value : false));

function onRailUpdate(val: boolean) {
  isRail.value = val;
}

onMounted(() => {
  uiStore.sidebar = isDesktop.value;
});

watch(isDesktop, (val) => {
  if (val) isRail.value = true;
  uiStore.sidebar = val;
});

function isActive(to?: string) {
  if (!to) return false;
  return route.path === to;
}

const baseNavItems = [
  { title: 'Dashboard', icon: 'mdi-view-dashboard-outline', to: '/', section: 'General' },
];

const moduleNavItems = computed(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: any[] = [];
  const modules = tenantStore.activeModules;
  const isAdmin = authStore.isAdmin;

  if (modules.appointments) {
    const section = 'Citas';
    items.push({ title: 'Agenda', icon: 'mdi-calendar-outline', to: '/appointments/agenda', section });
    items.push({ title: 'Horarios', icon: 'mdi-clock-outline', to: '/appointments/schedules', section });
    if (isAdmin) {
      items.push({ title: 'Catálogo y Servicios', icon: 'mdi-book-open-outline', to: '/appointments/catalog', section });
      items.push({ title: 'Empleados', icon: 'mdi-account-group-outline', to: '/appointments/employees', section });
    } else {
      items.push({ title: 'Mis Servicios', icon: 'mdi-content-cut', to: '/appointments/my-services', section });
    }
    items.push({ title: 'Historial', icon: 'mdi-history', to: '/appointments/history', section });
    items.push({ title: 'Notificaciones', icon: 'mdi-bell-outline', to: '/appointments/notifications', section });
  }

  if (modules.digital_menu && isAdmin) {
    items.push({
      title: 'Carta Digital',
      icon: 'mdi-silverware-fork-knife',
      section: 'Carta Digital',
      children: [
        { title: 'Categorías', icon: 'mdi-shape-outline', to: '/menu/categories' },
        { title: 'Productos', icon: 'mdi-food-outline', to: '/menu/products' },
        { title: 'Mesas', icon: 'mdi-table-furniture', to: '/menu/tables' },
        { title: 'Pedidos', icon: 'mdi-clipboard-list-outline', to: '/menu/orders' },
      ],
    });
  }

  if (modules.crm && isAdmin) {
    items.push({
      title: 'CRM',
      icon: 'mdi-account-group-outline',
      section: 'CRM',
      children: [
        { title: 'Clientes', icon: 'mdi-account-outline', to: '/crm/customers' },
        { title: 'Etiquetas', icon: 'mdi-tag-outline', to: '/crm/tags' },
        { title: 'Fidelización', icon: 'mdi-star-outline', to: '/crm/loyalty' },
      ],
    });
  }

  return items;
});

const settingsNav = computed(() => {
  if (!authStore.isAdmin) return [];
  return [
    {
      title: 'Configuración',
      icon: 'mdi-cog-outline',
      section: 'Configuración',
      children: [
        { title: 'Mi Negocio', icon: 'mdi-store-outline', to: '/settings/business' },
        { title: 'Módulos', icon: 'mdi-puzzle-outline', to: '/settings/modules' },
        { title: 'Config. Citas', icon: 'mdi-calendar-cursor', to: '/settings/appointments-config' },
      ],
    },
  ];
});

const navItems = computed(() => [...baseNavItems, ...moduleNavItems.value, ...settingsNav.value]);
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

.sidebar-item--child {
  padding-left: 16px !important;
}

.v-list-group__items .sidebar-item--child {
  padding-left: 16px !important;
}

.app-sidebar--mobile .sidebar-section-header {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-faint);
  padding-top: 14px;
  padding-bottom: 4px;
}

.app-sidebar--mobile .sidebar-item {
  font-size: 15px;
  font-weight: 500;
  letter-spacing: 0;
  min-height: 48px;
  padding-left: 14px !important;
  padding-right: 14px !important;
}

.app-sidebar--mobile .sidebar-item--child {
  padding-left: 14px !important;
}

.app-sidebar--mobile :deep(.v-list-item__prepend > .v-icon) {
  font-size: 26px;
}

.app-sidebar--mobile :deep(.v-list-item--active) {
  background-color: rgb(var(--v-theme-primary)) !important;
  color: #fff !important;
  font-weight: 600;
}

.app-sidebar--mobile :deep(.v-list-item--active .v-icon) {
  color: #fff !important;
}
</style>
