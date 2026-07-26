<template>
  <v-navigation-drawer
    v-model="drawer"
    :rail="rail"
    permanent
    app
  >
    <template #prepend>
      <v-list-item
        class="pa-4"
        :title="tenantStore.tenant?.name || 'Nexo Platform'"
        :subtitle="authStore.userRole"
        nav
      >
        <template #append>
          <v-btn
            icon
            variant="text"
            size="small"
            @click.stop="rail = !rail"
          >
            <v-icon>{{ rail ? 'mdi-chevron-right' : 'mdi-chevron-left' }}</v-icon>
          </v-btn>
        </template>
      </v-list-item>
    </template>

    <v-divider />

    <v-list density="compact" nav>
      <template v-for="item in navItems" :key="item.title">
        <v-list-item
          v-if="!item.children"
          :to="item.to"
          :title="item.title"
          :prepend-icon="item.icon"
          :value="item.title"
          color="primary"
          rounded="lg"
          class="ma-1"
        />
        <v-list-group v-else :value="item.title" :prepend-icon="item.icon">
          <template #activator="{ props }">
            <v-list-item
              v-bind="props"
              :title="item.title"
              rounded="lg"
              class="ma-1"
            />
          </template>
          <v-list-item
            v-for="child in item.children"
            :key="child.title"
            :to="child.to"
            :title="child.title"
            :prepend-icon="child.icon"
            color="primary"
            rounded="lg"
            class="ma-1 ml-4"
          />
        </v-list-group>
      </template>
    </v-list>
  </v-navigation-drawer>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAuthStore } from '@/shared/stores/auth.store';
import { useTenantStore } from '@/shared/stores/tenant.store';

const authStore = useAuthStore();
const tenantStore = useTenantStore();
const rail = ref(false);
const drawer = ref(true);

const baseNavItems = [{ title: 'Dashboard', icon: 'mdi-view-dashboard', to: '/' }];

const moduleNavItems = computed(() => {
// eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: any[] = [];
  const modules = tenantStore.activeModules;
  const isAdmin = authStore.isAdmin;

  if (modules.appointments) {
    items.push({ title: 'Agenda', icon: 'mdi-calendar', to: '/appointments/agenda' });
    if (isAdmin) {
      items.push({ title: 'Servicios', icon: 'mdi-content-cut', to: '/appointments/services' });
      items.push({ title: 'Empleados', icon: 'mdi-account-group', to: '/appointments/employees' });
      items.push({ title: 'Horarios', icon: 'mdi-clock-outline', to: '/appointments/schedules' });
    }
    items.push({ title: 'Reservas', icon: 'mdi-book-check', to: '/appointments/bookings' });
    items.push({ title: 'Historial', icon: 'mdi-history', to: '/appointments/history' });
  }

  if (modules.digital_menu && isAdmin) {
    items.push({
      title: 'Carta Digital',
      icon: 'mdi-menu',
      children: [
        { title: 'Categorías', icon: 'mdi-shape', to: '/menu/categories' },
        { title: 'Productos', icon: 'mdi-food', to: '/menu/products' },
        { title: 'Mesas', icon: 'mdi-table', to: '/menu/tables' },
        { title: 'Pedidos', icon: 'mdi-clipboard-list', to: '/menu/orders' },
      ],
    });
  }

  if (modules.crm && isAdmin) {
    items.push({
      title: 'CRM',
      icon: 'mdi-account-group',
      children: [
        { title: 'Clientes', icon: 'mdi-account', to: '/crm/customers' },
        { title: 'Etiquetas', icon: 'mdi-tag', to: '/crm/tags' },
        { title: 'Fidelización', icon: 'mdi-star', to: '/crm/loyalty' },
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
      icon: 'mdi-cog',
      children: [
        { title: 'Mi Negocio', icon: 'mdi-store', to: '/settings/business' },
        { title: 'Equipo', icon: 'mdi-account-group', to: '/settings/team' },
        { title: 'Módulos', icon: 'mdi-puzzle', to: '/settings/modules' },
        { title: 'Config. Citas', icon: 'mdi-calendar-cog', to: '/settings/appointments-config' },
      ],
    },
  ];
});

const navItems = computed(() => [...baseNavItems, ...moduleNavItems.value, ...settingsNav.value]);
</script>
