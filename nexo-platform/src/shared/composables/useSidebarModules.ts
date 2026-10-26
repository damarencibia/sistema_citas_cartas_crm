import { computed } from 'vue';
import type { ComputedRef } from 'vue';
import type { RouteLocationNormalizedLoaded } from 'vue-router';
import { useAuthStore } from '@/shared/stores/auth.store';
import { useTenantStore } from '@/shared/stores/tenant.store';
import { useWorkspaceStore } from '@/shared/stores/workspace.store';

export type AgendaTab = 'reservas' | 'espera';

export interface SidebarOption {
  title: string;
  icon: string;
  to: string;
  tab?: AgendaTab;
  vista?: 'equipo';
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

const AGENDA_ADMIN_OPTIONS: SidebarOption[] = [
  { title: 'Mi Día del Equipo', icon: 'mdi-view-column', to: '/appointments/agenda?tab=reservas&vista=equipo', tab: 'reservas', vista: 'equipo' },
  { title: 'Reservas', icon: 'mdi-clipboard-text-outline', to: '/appointments/agenda?tab=reservas', tab: 'reservas' },
  { title: 'Espera', icon: 'mdi-account-clock-outline', to: '/appointments/agenda?tab=espera', tab: 'espera' },
  { title: 'Horarios', icon: 'mdi-clock-outline', to: '/appointments/schedules' },
];

const AGENDA_WORK_OPTIONS: SidebarOption[] = [
  { title: 'Reservas', icon: 'mdi-clipboard-text-outline', to: '/appointments/agenda?tab=reservas', tab: 'reservas' },
  { title: 'Espera', icon: 'mdi-account-clock-outline', to: '/appointments/agenda?tab=espera', tab: 'espera' },
];

const EVENTS_OPTIONS: SidebarOption[] = [
  { title: 'Mis Eventos', icon: 'mdi-calendar-star', to: '/events' },
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
  const workspaceStore = useWorkspaceStore();

  const modules: ComputedRef<SidebarModule[]> = computed(() => {
    const m = tenantStore.activeModules;
    const admin = authStore.isAdmin;
    const role = authStore.userRole;
    const workMode = workspaceStore.isWorkMode;
    const list: SidebarModule[] = [];

    // ── Espacio de trabajo (gestión individual) ────────────────────────
    if (workMode) {
      if (m.appointments) {
        list.push({
          key: 'my-agenda',
          title: 'Mi Agenda',
          icon: 'mdi-calendar-outline',
          to: '/appointments/agenda?tab=reservas',
          options: AGENDA_WORK_OPTIONS,
        });
        list.push({ key: 'my-services', title: 'Mis Servicios', icon: 'mdi-content-cut', to: '/appointments/my-services', options: [] });
      }
      return list;
    }

    // ── Espacio de administración (gestión del negocio) ────────────────
    list.push({ key: 'dashboard', title: 'Dashboard', icon: 'mdi-view-dashboard-outline', to: '/', options: [] });

    if (m.events && admin) {
      list.push({
        key: 'events',
        title: 'Eventos',
        icon: 'mdi-calendar-star',
        to: '/events',
        options: EVENTS_OPTIONS,
      });
    }

    if (m.appointments && admin) {
      list.push({
        key: 'agenda',
        title: 'Agendas del Equipo',
        icon: 'mdi-calendar-outline',
        to: '/appointments/agenda?tab=reservas&vista=equipo',
        options: AGENDA_ADMIN_OPTIONS,
      });
    }

    if (m.crm && admin) {
      list.push({ key: 'crm', title: 'CRM', icon: 'mdi-account-group-outline', to: '/crm/customers', options: CRM_OPTIONS });
    }

    if (admin) {
      list.push({ key: 'config', title: 'Configuración', icon: 'mdi-cog-outline', to: '/settings/business', options: CONFIG_OPTIONS });
    }

    // empleados puros (único caso sin toggle): ven Mis Servicios en su menú propio
    if (m.appointments && role === 'employee' && !admin) {
      list.push({ key: 'my-services', title: 'Mis Servicios', icon: 'mdi-content-cut', to: '/appointments/my-services', options: [] });
    }

    return list;
  });

  function routeToModuleKey(route: RouteLocationNormalizedLoaded): string {
    const { path } = route;
    if (path === '/') return 'dashboard';
    if (path.startsWith('/appointments/agenda') || path === '/appointments/schedules') {
      return workspaceStore.isWorkMode ? 'my-agenda' : 'agenda';
    }
    if (path === '/appointments/my-services') return 'my-services';
    if (path.startsWith('/events')) return 'events';
    if (path.startsWith('/crm/')) return 'crm';
    if (path.startsWith('/settings/') || path.startsWith('/appointments/')) return 'config';
    if (path.startsWith('/admin/')) return 'super-admin';
    return 'dashboard';
  }

  function isOptionActive(route: RouteLocationNormalizedLoaded, opt: SidebarOption): boolean {
    if (route.path !== opt.to.split('?')[0]) return false;
    if (opt.vista) {
      return (route.query.vista as string | undefined) === opt.vista;
    }
    if (opt.tab) {
      const tab = route.query.tab as string | undefined;
      if ((tab ?? 'reservas') !== opt.tab) return false;
      // 'Reservas' solo cuando no estamos en la vista de equipo
      return route.query.vista !== 'equipo';
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
