# 12 — Navigation

## Objetivo

Definir la estructura de navegación de la plataforma, incluyendo el árbol de rutas, la navegación por roles, el sidebar, los breadcrumbs, las rutas públicas y los guards de navegación.

---

## Alcance

Cubre todas las rutas del frontend (Vue Router), la organización del sidebar, la navegación entre módulos, la navegación pública para clientes y el manejo de errores 404/403.

---

## Dependencias

- 05-system-architecture.md — Define la estructura modular y lazy loading.
- 06-folder-structure.md — Define la ubicación de los archivos de rutas.
- 08-authentication.md — Define los guards de autenticación.
- 10-user-roles.md — Define los guards de roles.
- 11-ui-design-system.md — Define los layouts.

---

## Estructura de Rutas

### Árbol Completo de Navegación

```
/
├── /login                          → LoginView        [auth layout, público]
├── /register                       → RegisterView     [auth layout, público]
├── /forgot-password                → ForgotPasswordView [auth layout, público]
├── /reset-password                 → ResetPasswordView [auth layout, público]
│
├── /accept-invite                  → AcceptInviteView  [auth layout, público]
│
├── /dashboard                      → DashboardView     [default layout, auth]
│
├── /appointments                   → Módulo de Citas   [default layout, auth]
│   ├── /appointments/agenda        → AgendaView       [admin/owner/employee]
│   ├── /appointments/services      → ServicesView     [admin/owner]
│   ├── /appointments/employees     → EmployeesView    [admin/owner]
│   ├── /appointments/schedules     → SchedulesView    [admin/owner]
│   ├── /appointments/bookings      → BookingsView     [admin/owner]
│   └── /appointments/history       → BookingHistoryView [admin/owner]
│
├── /digital-menu                   → Módulo Carta Digital [default layout, auth]
│   ├── /digital-menu/menus         → MenuManagementView [admin/owner]
│   ├── /digital-menu/categories    → CategoriesView    [admin/owner]
│   ├── /digital-menu/products      → ProductsView      [admin/owner]
│   ├── /digital-menu/products/new  → ProductFormView   [admin/owner]
│   ├── /digital-menu/products/:id  → ProductFormView   [admin/owner]
│   ├── /digital-menu/tables        → TablesView        [admin/owner]
│   ├── /digital-menu/orders        → OrdersPanelView   [employee/admin/owner]
│   └── /digital-menu/orders/history→ OrderHistoryView  [admin/owner]
│
├── /crm                            → Módulo CRM       [default layout, auth]
│   ├── /crm/customers              → CustomerListView  [employee/admin/owner]
│   ├── /crm/customers/:id          → CustomerDetailView [employee/admin/owner]
│   ├── /crm/customers/new          → CustomerFormView  [employee/admin/owner]
│   ├── /crm/tags                   → TagsManagementView [admin/owner]
│   ├── /crm/loyalty                → LoyaltyConfigView [owner]
│   └── /crm/stats                  → CustomerStatsView [admin/owner]
│
├── /admin                          → Módulo Admin Negocio [default layout, auth]
│   ├── /admin/business             → BusinessProfileView [owner]
│   ├── /admin/team                 → TeamManagementView [admin/owner]
│   ├── /admin/subscription         → SubscriptionView  [owner]
│   ├── /admin/modules              → ModulesConfigView [owner]
│   └── /admin/settings             → SettingsView      [owner]
│
├── /super-admin                    → Módulo Super Admin [default layout, super_admin]
│   ├── /super-admin/tenants        → TenantsListView
│   ├── /super-admin/tenants/:id    → TenantDetailView
│   ├── /super-admin/stats          → PlatformStatsView
│   ├── /super-admin/audit-logs     → AuditLogsView
│   └── /super-admin/plans          → PlansManagementView
│
├── /client                         → Portal del Cliente [public layout, auth]
│   ├── /client/profile             → ClientProfileView
│   ├── /client/history             → ClientHistoryView
│   └── /client/loyalty             → ClientLoyaltyView
│
├── /public/:slug                   → Rutas Públicas    [public layout, anónimo]
│   ├── /public/:slug/menu          → PublicMenuView        (carta digital)
│   ├── /public/:slug/booking       → PublicBookingView     (reserva de citas)
│   └── /public/:slug/order/:id     → PublicOrderTracking   (seguimiento de pedido)
│
└── /:pathMatch(.*)*                → NotFoundView     [layout mínimo]
```

---

## Configuración del Router

```typescript
// app/router/index.ts
import { createRouter, createWebHistory } from 'vue-router';
import { routes } from './routes';
import { requireAuth, requireRole, requireModule, resolveTenantSlug } from './guards';

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition;
    return { top: 0 };
  },
});

// Guards globales
router.beforeEach(async (to, from, next) => {
  // Inicializar store de auth si no está inicializada
  const authStore = useAuthStore();
  if (authStore.loading) {
    await authStore.initialize();
  }

  // Si la ruta tiene meta.requiresSlugResolution, resolver slug
  if (to.meta.requiresSlugResolution) {
    const tenantStore = useTenantStore();
    const slug = to.params.slug as string;
    await tenantStore.resolveBySlug(slug);
    if (!tenantStore.current) {
      return next({ name: 'NotFound' });
    }
  }

  next();
});

export default router;
```

---

## Definición de Rutas (Fragmento)

```typescript
// app/router/routes.ts
import type { RouteRecordRaw } from 'vue-router';

export const routes: RouteRecordRaw[] = [
  // ─── Auth Routes ───────────────────────────────────────────
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/app/layouts/auth.vue'),
    children: [
      {
        path: '',
        component: () => import('@modules/auth/views/LoginView.vue'),
      },
    ],
    meta: { layout: 'auth', guest: true },
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/app/layouts/auth.vue'),
    children: [
      {
        path: '',
        component: () => import('@modules/auth/views/RegisterView.vue'),
      },
    ],
    meta: { layout: 'auth', guest: true },
  },

  // ─── Authenticated Routes ─────────────────────────────────
  {
    path: '/dashboard',
    component: () => import('@/app/layouts/default.vue'),
    children: [
      {
        path: '',
        name: 'Dashboard',
        component: () => import('@modules/admin/views/DashboardView.vue'),
      },
    ],
    meta: { requiresAuth: true },
  },

  // ─── Appointments Module ──────────────────────────────────
  {
    path: '/appointments',
    component: () => import('@/app/layouts/default.vue'),
    meta: { requiresAuth: true, module: 'appointments' },
    children: [
      {
        path: 'agenda',
        name: 'AppointmentsAgenda',
        component: () => import('@modules/appointments/views/AgendaView.vue'),
      },
      {
        path: 'services',
        name: 'AppointmentsServices',
        component: () => import('@modules/appointments/views/ServicesView.vue'),
        meta: { roles: ['owner', 'admin'] },
      },
      {
        path: 'employees',
        name: 'AppointmentsEmployees',
        component: () => import('@modules/appointments/views/EmployeesView.vue'),
        meta: { roles: ['owner', 'admin'] },
      },
      {
        path: 'schedules',
        name: 'AppointmentsSchedules',
        component: () => import('@modules/appointments/views/SchedulesView.vue'),
        meta: { roles: ['owner', 'admin'] },
      },
      {
        path: 'bookings',
        name: 'AppointmentsBookings',
        component: () => import('@modules/appointments/views/BookingsView.vue'),
      },
      {
        path: 'history',
        name: 'AppointmentsHistory',
        component: () => import('@modules/appointments/views/BookingHistoryView.vue'),
        meta: { roles: ['owner', 'admin'] },
      },
    ],
  },

  // ─── Public Routes ────────────────────────────────────────
  {
    path: '/public/:slug/menu',
    name: 'PublicMenu',
    component: () => import('@modules/digital-menu/views/PublicMenuView.vue'),
    meta: { layout: 'public', requiresSlugResolution: true },
  },
  {
    path: '/public/:slug/booking',
    name: 'PublicBooking',
    component: () => import('@modules/appointments/views/PublicBookingView.vue'),
    meta: { layout: 'public', requiresSlugResolution: true },
  },

  // ─── 404 ──────────────────────────────────────────────────
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@shared/components/NotFoundView.vue'),
  },
];
```

---

## Sidebar Navigation

El sidebar es el menú principal de navegación para usuarios autenticados. Se genera dinámicamente según:

1. **Rol del usuario**: Se muestran/ocultan secciones según permisos.
2. **Módulos activos**: Solo se muestran módulos activados para el tenant.
3. **Estado del tenant**: Si está en trial, se muestra banner informativo.

### Estructura del Sidebar

```typescript
// shared/components/AppSidebar.vue
const menuItems = computed(() => {
  const items = [];

  // Dashboard (siempre visible para usuarios autenticados)
  items.push({
    title: 'Dashboard',
    icon: 'mdi-view-dashboard',
    route: '/dashboard',
  });

  // Módulo: Citas (si activo)
  if (tenantStore.modules.appointments) {
    items.push({
      title: 'Citas',
      icon: 'mdi-calendar',
      children: [
        { title: 'Agenda', route: '/appointments/agenda' },
        ...(can.manageServices ? [{ title: 'Servicios', route: '/appointments/services' }] : []),
        ...(can.manageEmployees ? [{ title: 'Empleados', route: '/appointments/employees' }] : []),
        ...(can.manageServices ? [{ title: 'Horarios', route: '/appointments/schedules' }] : []),
        { title: 'Historial', route: '/appointments/history' },
      ],
    });
  }

  // Módulo: Carta Digital (si activo)
  if (tenantStore.modules.digital_menu) {
    items.push({
      title: 'Carta Digital',
      icon: 'mdi-food',
      badge: orderStore.pendingCount, // Badge con pedidos pendientes
      children: [
        { title: 'Pedidos', route: '/digital-menu/orders' },
        ...(can.manageProducts ? [{ title: 'Productos', route: '/digital-menu/products' }] : []),
        ...(can.manageProducts ? [{ title: 'Categorías', route: '/digital-menu/categories' }] : []),
        ...(can.manageProducts ? [{ title: 'Menús', route: '/digital-menu/menus' }] : []),
        ...(can.manageProducts ? [{ title: 'Mesas', route: '/digital-menu/tables' }] : []),
      ],
    });
  }

  // Módulo: CRM (si activo)
  if (tenantStore.modules.crm) {
    items.push({
      title: 'CRM',
      icon: 'mdi-account-group',
      children: [
        { title: 'Clientes', route: '/crm/customers' },
        ...(can.manageServices ? [{ title: 'Etiquetas', route: '/crm/tags' }] : []),
        ...(can.manageLoyalty ? [{ title: 'Fidelización', route: '/crm/loyalty' }] : []),
        ...(can.manageServices ? [{ title: 'Estadísticas', route: '/crm/stats' }] : []),
      ],
    });
  }

  // Administración (solo admin/owner)
  if (can.manageEmployees) {
    items.push({
      title: 'Administración',
      icon: 'mdi-cog',
      children: [
        ...(can.manageEmployees ? [{ title: 'Mi Negocio', route: '/admin/business' }] : []),
        { title: 'Equipo', route: '/admin/team' },
        ...(authStore.isOwner ? [{ title: 'Suscripción', route: '/admin/subscription' }] : []),
        ...(authStore.isOwner ? [{ title: 'Módulos', route: '/admin/modules' }] : []),
        { title: 'Configuración', route: '/admin/settings' },
      ],
    });
  }

  return items;
});
```

### Comportamiento del Sidebar

| Estado      | Desktop (>960px)                 | Móvil (<960px)        |
| ----------- | -------------------------------- | --------------------- |
| Por defecto | Expandido                        | Oculto (hamburguesa)  |
| Colapsado   | Solo iconos (64px)               | —                     |
| Con badge   | Muestra badge en ítem de pedidos | Mismo                 |
| Submenús    | Expandibles por hover/click      | Expandibles por click |

---

## Breadcrumbs

Las breadcrumbs (migas de pan) se generan automáticamente a partir de la ruta actual y las metaetiquetas del router.

```vue
<!-- shared/components/AppBreadcrumbs.vue -->
<template>
  <v-breadcrumbs :items="breadcrumbs">
    <template #title="{ item }">
      <router-link :to="item.to" v-if="item.to">
        {{ item.title }}
      </router-link>
      <span v-else>{{ item.title }}</span>
    </template>
  </v-breadcrumbs>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();

const breadcrumbs = computed(() => {
  const pathSegments = route.path.split('/').filter(Boolean);
  const crumbs = [{ title: 'Inicio', to: '/dashboard' }];

  let currentPath = '';
  for (const segment of pathSegments) {
    currentPath += `/${segment}`;
    // Buscar meta.title de la ruta coincidente
    const matched = route.matched.find((r) => r.path === `/${segment}`);
    crumbs.push({
      title: matched?.meta?.title ?? segment,
      to: currentPath === route.path ? undefined : currentPath,
    });
  }

  return crumbs;
});
</script>
```

---

## Navegación Pública (Clientes)

Las rutas públicas no requieren autenticación. El tenant se identifica mediante el slug en la URL.

### Flujo de Navegación Pública

```
1. Cliente escanea QR de mesa
        │
        ▼
2. URL: https://nexo.app/public/mi-cafeteria/menu?table=5
        │
        ▼
3. Router: /public/:slug/menu
        │
        ▼
4. Guard: resolveTenantSlug
   → Obtiene tenant_id desde el slug
   → Carga datos públicos del tenant (logo, colores, nombre)
   → Configura tema Vuetify con colores del tenant
        │
        ▼
5. Vista: PublicMenuView
   → Muestra carta digital con colores del negocio
   → Los productos se consultan con anon key + tenant_id
   → El carrito persiste en localStorage
```

### Enlaces Navegación Pública

| Acción del Cliente             | Ruta                                      | Descripción              |
| ------------------------------ | ----------------------------------------- | ------------------------ |
| Escanear QR                    | `/public/:slug/menu?table=N`              | Carta digital            |
| Link de reserva                | `/public/:slug/booking`                   | Formulario de reserva    |
| Seguimiento de pedido          | `/public/:slug/order/:id`                 | Estado del pedido        |
| Cancelar cita (desde email)    | `/public/:slug/cancel-booking/:token`     | Cancelación con token    |
| Reprogramar cita (desde email) | `/public/:slug/reschedule-booking/:token` | Reprogramación con token |

---

## Navegación por Teclado

| Tecla      | Acción                               |
| ---------- | ------------------------------------ |
| `Ctrl + K` | Abrir búsqueda global (cmd+k en Mac) |
| `Escape`   | Cerrar modal/drawer                  |
| `Tab`      | Navegar entre campos de formulario   |
| `Enter`    | Enviar formulario / seleccionar      |
| `?`        | Mostrar atajos de teclado            |

---

## Estados de Error en Navegación

| Ruta              | Condición                  | Acción                                                        |
| ----------------- | -------------------------- | ------------------------------------------------------------- |
| `/404`            | Ruta no encontrada         | Mostrar NotFoundView con link al dashboard                    |
| `/403`            | Sin permisos               | Mostrar ForbiddenView con mensaje y link                      |
| `/public/:slug/*` | Slug inválido              | Mostrar NotFoundView                                          |
| `/public/:slug/*` | Tenant inactivo/suspendido | Mostrar mensaje "Este negocio no está disponible actualmente" |
| `/public/:slug/*` | Módulo desactivado         | Mostrar mensaje "Esta funcionalidad no está disponible"       |

---

## Decisiones Tomadas

| Decisión                | Opción                       | Alternativas                 | Justificación                                                                    |
| ----------------------- | ---------------------------- | ---------------------------- | -------------------------------------------------------------------------------- |
| Lazy loading            | `() => import(...)`          | Carga temprana               | Reduce el bundle inicial. Cada módulo se carga solo cuando se visita.            |
| Slug en path            | `/public/:slug/...`          | Subdominio (tenant.nexo.app) | Más simple de configurar. No requiere DNS wildcard ni SSL por subdominio.        |
| Sidebar dinámico        | Generado por roles + módulos | Sidebar estático             | Se adapta automáticamente a los permisos del usuario y configuración del tenant. |
| Breadcrumbs automáticas | Generadas de la ruta         | Manuales por vista           | Menos código duplicado. Consistentes en toda la app.                             |
| 404 vs redirección      | Página 404                   | Redirigir a dashboard        | Mejor UX: el usuario sabe que la ruta no existe.                                 |

---

## Posibles Mejoras Futuras

- **Subdominios por tenant** (`mi-negocio.nexo.app`) para mejorar SEO de páginas públicas.
- **Búsqueda global** (Ctrl+K) que busca en todos los módulos (clientes, servicios, productos, citas).
- **Notificaciones en el sidebar** con contador de pedidos pendientes, citas próximas, etc.
- **Tour de onboarding** que guía al nuevo propietario paso a paso por las secciones principales.
- **Atajos de teclado personalizables**.
- **Navegación por gestos** en dispositivos móviles (swipe para sidebar).

---

_Documento generado el: 04/07/2026_
_Versión: 1.0_
_Próximo documento: 13-module-appointments.md_
