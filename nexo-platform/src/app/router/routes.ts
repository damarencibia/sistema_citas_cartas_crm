import type { RouteRecordRaw } from 'vue-router';

export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('@/app/layouts/default.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'dashboard',
        component: () => import('@/modules/admin/views/DashboardView.vue'),
        meta: { title: 'Dashboard', icon: 'mdi-view-dashboard', workspace: 'admin' },
      },
      {
        path: 'appointments',
        meta: { title: 'Citas', icon: 'mdi-calendar-clock' },
        children: [
          {
            path: 'agenda',
            name: 'agenda',
            component: () => import('@/modules/appointments/views/AgendaView.vue'),
            meta: { title: 'Agenda' },
          },
          {
            path: 'categories',
            redirect: '/appointments/catalog',
          },
          {
            path: 'catalog',
            name: 'service-catalog',
            component: () => import('@/modules/appointments/views/ServiceCatalogView.vue'),
            meta: { title: 'Catálogo y Servicios', role: 'admin' },
          },
          {
            path: 'services',
            redirect: '/appointments/catalog',
          },
          {
            path: 'my-services',
            name: 'my-services',
            component: () => import('@/modules/appointments/views/MyServicesView.vue'),
            meta: { title: 'Mis Servicios', role: 'employee', workspace: 'work' },
          },
          {
            path: 'employees',
            name: 'employees',
            component: () => import('@/modules/appointments/views/EmployeesView.vue'),
            meta: { title: 'Empleados', role: 'admin', workspace: 'admin' },
          },
          {
            path: 'schedules',
            name: 'schedules',
            component: () => import('@/modules/appointments/views/SchedulesView.vue'),
            meta: { title: 'Horarios', workspace: 'admin' },
          },
          {
            path: 'bookings',
            redirect: '/appointments/agenda',
          },
          {
            path: 'history',
            name: 'booking-history',
            component: () => import('@/modules/appointments/views/BookingHistoryView.vue'),
            meta: { title: 'Historial', workspace: 'admin' },
          },
        ],
      },
      {
        path: 'events',
        meta: { title: 'Eventos', icon: 'mdi-calendar-star', workspace: 'admin' },
        children: [
          {
            path: '',
            name: 'events',
            component: () => import('@/modules/events/views/EventsView.vue'),
            meta: { title: 'Eventos' },
          },
        ],
      },
      {
        path: 'crm',
        meta: { title: 'CRM', icon: 'mdi-account-group', workspace: 'admin' },
        children: [
          {
            path: 'customers',
            name: 'customers',
            component: () => import('@/modules/crm/views/CustomerListView.vue'),
            meta: { title: 'Clientes' },
          },
          {
            path: 'customers/:id',
            name: 'customer-detail',
            component: () => import('@/modules/crm/views/CustomerDetailView.vue'),
            meta: { title: 'Detalle Cliente' },
          },
          {
            path: 'tags',
            name: 'crm-tags',
            component: () => import('@/modules/crm/views/TagsManagementView.vue'),
            meta: { title: 'Etiquetas' },
          },
          {
            path: 'loyalty',
            name: 'crm-loyalty',
            component: () => import('@/modules/crm/views/LoyaltyConfigView.vue'),
            meta: { title: 'Fidelización' },
          },
        ],
      },
      {
        path: 'settings',
        meta: { title: 'Configuración', icon: 'mdi-cog' },
        children: [
          {
            path: 'business',
            name: 'business-profile',
            component: () => import('@/modules/admin/views/BusinessProfileView.vue'),
            meta: { title: 'Mi Negocio', workspace: 'admin' },
          },
          {
            path: 'account',
            name: 'account',
            component: () => import('@/modules/admin/views/AccountView.vue'),
            meta: { title: 'Mi Cuenta' },
          },
          {
            path: 'modules',
            name: 'modules-config',
            component: () => import('@/modules/admin/views/ModulesConfigView.vue'),
            meta: { title: 'Módulos', workspace: 'admin' },
          },
          {
            path: 'portal',
            redirect: '/settings/business',
          },
          {
            path: 'appointments-config',
            name: 'appointments-config',
            component: () => import('@/modules/admin/views/AppointmentSettingsView.vue'),
            meta: { title: 'Config. Citas', workspace: 'admin' },
          },
        ],
      },
    ],
  },
  {
    path: '/auth',
    component: () => import('@/app/layouts/auth.vue'),
    children: [
      {
        path: 'login',
        name: 'login',
        component: () => import('@/modules/admin/views/auth/LoginView.vue'),
        meta: { title: 'Iniciar Sesión' },
      },
      {
        path: 'register',
        name: 'register',
        component: () => import('@/modules/admin/views/auth/RegisterView.vue'),
        meta: { title: 'Registrarse' },
      },
      {
        path: 'forgot-password',
        name: 'forgot-password',
        component: () => import('@/modules/admin/views/auth/ForgotPasswordView.vue'),
        meta: { title: 'Recuperar Contraseña' },
      },
      {
        path: 'reset-password',
        name: 'reset-password',
        component: () => import('@/modules/admin/views/auth/ResetPasswordView.vue'),
        meta: { title: 'Resetear Contraseña' },
      },
    ],
  },
  {
    path: '/:slug',
    component: () => import('@/app/layouts/public.vue'),
    children: [
      {
        path: '',
        name: 'public-business-profile',
        component: () => import('@/modules/appointments/views/BusinessProfileView.vue'),
        meta: { title: 'Inicio' },
      },
      {
        path: 'booking',
        name: 'public-booking',
        component: () => import('@/modules/appointments/views/PublicBookingView.vue'),
        meta: { title: 'Reservar Cita' },
      },
      {
        path: 'events',
        name: 'public-events',
        component: () => import('@/modules/events/views/PublicEventsView.vue'),
        meta: { title: 'Eventos' },
      },
      {
        path: 'events/registration/:token',
        name: 'public-registration-status',
        component: () => import('@/modules/events/views/PublicRegistrationStatusView.vue'),
        meta: { title: 'Mi Registro' },
      },
      {
        path: 'events/:eventId',
        name: 'public-event-detail',
        component: () => import('@/modules/events/views/PublicEventDetailView.vue'),
        meta: { title: 'Evento' },
      },
      {
        path: 'portal',
        name: 'client-portal',
        component: () => import('@/modules/crm/views/ClientPortalView.vue'),
        meta: { title: 'Mi Portal' },
      },
      {
        path: 'waitlist/accept/:token',
        name: 'waitlist-accept',
        component: () => import('@/modules/appointments/views/WaitlistOfferView.vue'),
        meta: { title: 'Oferta de Lista de Espera' },
      },
      {
        path: 'waitlist/decline/:token',
        name: 'waitlist-decline',
        component: () => import('@/modules/appointments/views/WaitlistOfferView.vue'),
        meta: { title: 'Lista de Espera' },
      },
      {
        path: 'reservas/:token',
        name: 'my-bookings',
        component: () => import('@/modules/appointments/views/MyBookingsView.vue'),
        meta: { title: 'Mis Reservas' },
      },
    ],
  },
  {
    path: '/admin',
    component: () => import('@/app/layouts/admin.vue'),
    meta: { requiresAuth: true, role: 'super_admin' },
    children: [
      {
        path: 'tenants',
        name: 'admin-tenants',
        component: () => import('@/modules/super-admin/views/TenantsListView.vue'),
        meta: { title: 'Tenants' },
      },
      {
        path: 'tenants/:id',
        name: 'admin-tenant-detail',
        component: () => import('@/modules/super-admin/views/TenantDetailView.vue'),
        meta: { title: 'Detalle Tenant' },
      },
      {
        path: 'stats',
        name: 'admin-stats',
        component: () => import('@/modules/super-admin/views/PlatformStatsView.vue'),
        meta: { title: 'Estadísticas' },
      },
      {
        path: 'audit',
        name: 'admin-audit',
        component: () => import('@/modules/super-admin/views/AuditLogsView.vue'),
        meta: { title: 'Auditoría' },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/shared/components/NotFoundView.vue'),
    meta: { title: '404' },
  },
];
