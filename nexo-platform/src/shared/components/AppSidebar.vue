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
    @update:rail="onRailUpdate"
  >
    <template #prepend>
      <div class="sidebar-brand d-flex align-center pa-3" :class="rail ? 'justify-center' : 'justify-space-between'">
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

    <v-list density="compact" nav class="pa-2">
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

const baseNavItems = [{ title: 'Dashboard', icon: 'mdi-view-dashboard-outline', to: '/' }];

const moduleNavItems = computed(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: any[] = [];
  const modules = tenantStore.activeModules;
  const isAdmin = authStore.isAdmin;

  if (modules.appointments) {
    items.push({ title: 'Agenda', icon: 'mdi-calendar-outline', to: '/appointments/agenda' });
    items.push({ title: 'Horarios', icon: 'mdi-clock-outline', to: '/appointments/schedules' });
    if (isAdmin) {
      items.push({ title: 'Catálogo y Servicios', icon: 'mdi-book-open-outline', to: '/appointments/catalog' });
      items.push({ title: 'Empleados', icon: 'mdi-account-group-outline', to: '/appointments/employees' });
    } else {
      items.push({ title: 'Mis Servicios', icon: 'mdi-content-cut', to: '/appointments/my-services' });
    }
    items.push({ title: 'Reservas', icon: 'mdi-book-check-outline', to: '/appointments/bookings' });
    items.push({ title: 'Historial', icon: 'mdi-history', to: '/appointments/history' });
    items.push({ title: 'Notificaciones', icon: 'mdi-bell-outline', to: '/appointments/notifications' });
  }

  if (modules.digital_menu && isAdmin) {
    items.push({
      title: 'Carta Digital',
      icon: 'mdi-silverware-fork-knife',
      children: [
        { title: 'Categorías', icon: 'mdi-shape-outline', to: '/menu/categories' },
        { title: 'Productos', icon: 'mdi-food-outline', to: '/menu/products' },
        { title: 'Mesas', icon: 'mdi-table', to: '/menu/tables' },
        { title: 'Pedidos', icon: 'mdi-clipboard-list-outline', to: '/menu/orders' },
      ],
    });
  }

  if (modules.crm && isAdmin) {
    items.push({
      title: 'CRM',
      icon: 'mdi-account-group-outline',
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
      children: [
        { title: 'Mi Negocio', icon: 'mdi-store-outline', to: '/settings/business' },
        { title: 'Módulos', icon: 'mdi-puzzle-outline', to: '/settings/modules' },
        { title: 'Config. Citas', icon: 'mdi-calendar-cog-outline', to: '/settings/appointments-config' },
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
</style>
