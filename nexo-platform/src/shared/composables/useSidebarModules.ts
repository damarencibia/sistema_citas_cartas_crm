import { computed } from 'vue';
import type { ComputedRef } from 'vue';
import type { RouteLocationNormalizedLoaded } from 'vue-router';
import { useAuthStore } from '@/shared/stores/auth.store';
import { useTenantStore } from '@/shared/stores/tenant.store';

export type AgendaTab = 'reservas' | 'espera';

export interface SidebarOption {
  title: string;
  icon: string;
  to: string;
  tab?: AgendaTab;
  action?: 'new-booking';
}

export interface SidebarModule {
  key: string;
  title: string;
  icon: string;
  to: string;
  options: SidebarOption[];
}

export interface BreadcrumbItem {
  title: string;
  to: string;
  isCurrent: boolean;
}

const AGENDA_OPTIONS: SidebarOption[] = [
  { title: 'Nueva Reserva', icon: 'mdi-calendar-plus', to: '/appointments/agenda?tab=reservas&nueva=1', action: 'new-booking' },
  { title: 'Reservas', icon: 'mdi-clipboard-text-outline', to: '/appointments/agenda?tab=reservas', tab: 'reservas' },
  { title: 'Espera', icon: 'mdi-account-clock-outline', to: '/appointments/agenda?tab=espera', tab: 'espera' },
  { title: 'Horarios', icon: 'mdi-clock-outline', to: '/appointments/schedules' },
];

const CARTA_OPTIONS: SidebarOption[] = [
  { title: 'Categorías', icon: 'mdi-shape-outline', to: '/menu/categories' },
  { title: 'Productos', icon: 'mdi-food-outline', to: '/menu/products' },
  { title: 'Mesas', icon: 'mdi-table-furniture', to: '/menu/tables' },
  { title: 'Pedidos', icon: 'mdi-clipboard-list-outline', to: '/menu/orders' },
];

const CRM_OPTIONS: SidebarOption[] = [
  { title: 'Clientes', icon: 'mdi-account-outline', to: '/crm/customers' },
  { title: 'Etiquetas', icon: 'mdi-tag-outline', to: '/crm/tags' },
  { title: 'Fidelización', icon: 'mdi-star-outline', to: '/crm/loyalty' },
];

const CONFIG_OPTIONS: SidebarOption[] = [
  { title: 'Mi Negocio', icon: 'mdi-store-outline', to: '/settings/business' },
  { title: 'Módulos', icon: 'mdi-puzzle-outline', to: '/settings/modules' },
  { title: 'Config. Citas', icon: 'mdi-calendar-cursor', to: '/settings/appointments-config' },
  { title: 'Catálogo y Servicios', icon: 'mdi-book-open-outline', to: '/appointments/catalog' },
  { title: 'Empleados', icon: 'mdi-account-group-outline', to: '/appointments/employees' },
  { title: 'Historial', icon: 'mdi-history', to: '/appointments/history' },
];

export function useSidebarModules() {
  const authStore = useAuthStore();
  const tenantStore = useTenantStore();

  const modules: ComputedRef<SidebarModule[]> = computed(() => {
    const m = tenantStore.activeModules;
    const admin = authStore.isAdmin;
    const role = authStore.userRole;
    const list: SidebarModule[] = [
      { key: 'dashboard', title: 'Dashboard', icon: 'mdi-view-dashboard-outline', to: '/', options: [] },
    ];

    if (m.appointments) {
      list.push({
        key: 'agenda',
        title: 'Agenda',
        icon: 'mdi-calendar-outline',
        to: '/appointments/agenda?tab=reservas',
        options: AGENDA_OPTIONS,
      });
      if (role === 'employee') {
        list.push({ key: 'my-services', title: 'Mis Servicios', icon: 'mdi-content-cut', to: '/appointments/my-services', options: [] });
      }
    }

    if (m.digital_menu && admin) {
      list.push({ key: 'carta-digital', title: 'Carta Digital', icon: 'mdi-silverware-fork-knife', to: '/menu/categories', options: CARTA_OPTIONS });
    }

    if (m.crm && admin) {
      list.push({ key: 'crm', title: 'CRM', icon: 'mdi-account-group-outline', to: '/crm/customers', options: CRM_OPTIONS });
    }

    if (admin) {
      list.push({ key: 'config', title: 'Configuración', icon: 'mdi-cog-outline', to: '/settings/business', options: CONFIG_OPTIONS });
    }

    return list;
  });

  function routeToModuleKey(route: RouteLocationNormalizedLoaded): string {
    const { path } = route;
    if (path === '/') return 'dashboard';
    if (path.startsWith('/appointments/agenda')) return 'agenda';
    if (path === '/appointments/schedules') return 'agenda';
    if (path === '/appointments/my-services') return 'my-services';
    if (path.startsWith('/menu/')) return 'carta-digital';
    if (path.startsWith('/crm/')) return 'crm';
    if (path.startsWith('/settings/') || path.startsWith('/appointments/')) return 'config';
    if (path.startsWith('/admin/')) return 'super-admin';
    return 'dashboard';
  }

  function isOptionActive(route: RouteLocationNormalizedLoaded, opt: SidebarOption): boolean {
    if (opt.action) return false;
    if (route.path !== opt.to.split('?')[0]) return false;
    if (opt.tab) {
      const tab = route.query.tab as string | undefined;
      return (tab ?? 'reservas') === opt.tab;
    }
    return route.query.nueva !== '1';
  }

  function getBreadcrumbs(route: RouteLocationNormalizedLoaded): BreadcrumbItem[] {
    const moduleKey = routeToModuleKey(route);
    if (moduleKey === 'super-admin') {
      const title = route.meta.title as string | undefined;
      return title ? [{ title, to: route.fullPath, isCurrent: true }] : [];
    }
    const mod = modules.value.find((m) => m.key === moduleKey);
    if (!mod) return [];
    const crumbs: BreadcrumbItem[] = [{ title: mod.title, to: mod.to, isCurrent: false }];
    const activeOpt = mod.options.find((opt) => isOptionActive(route, opt));
    if (activeOpt) {
      crumbs.push({ title: activeOpt.title, to: activeOpt.to, isCurrent: true });
    } else {
      crumbs[0].isCurrent = true;
    }
    return crumbs;
  }

  return { modules, routeToModuleKey, isOptionActive, getBreadcrumbs };
}
