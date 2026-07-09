# 06 — Folder Structure

## Objetivo

Definir la estructura completa de directorios del proyecto frontend (Vue 3) y la organización del backend (Supabase). Cada archivo y carpeta tiene un propósito definido que refleja la arquitectura modular descrita en 05-system-architecture.md.

---

## Alcance

Cubre la estructura de todo el repositorio de código, incluyendo frontend, edge functions, migraciones de base de datos, configuraciones y herramientas de desarrollo.

---

## Dependencias

- 04-tech-stack.md — Define las tecnologías que determinan ciertos archivos de configuración.
- 05-system-architecture.md — Define la arquitectura modular que esta estructura implementa.

---

## Principios de Organización

1. **Modularidad**: Cada módulo de negocio es una carpeta autocontenida dentro de `src/modules/`.
2. **Separación de responsabilidades**: Componentes, stores, composables, tipos y traducciones de cada módulo están separados.
3. **Convención sobre configuración**: La estructura sigue convenciones estándar de Vue 3 + Vite + Supabase.
4. **Cohesión**: Lo que cambia junto, está junto. Cada módulo contiene todo lo que necesita.
5. **Bajo acoplamiento**: Los módulos no importan archivos de otros módulos directamente.

---

## Estructura Raíz

```
nexo-platform/
├── .github/                    # Configuración de GitHub
│   ├── workflows/              # GitHub Actions (CI/CD)
│   │   ├── ci.yml             # Tests + lint en cada PR
│   │   └── deploy.yml         # Despliegue a producción
│   ├── ISSUE_TEMPLATE/        # Plantillas de issues
│   └── PULL_REQUEST_TEMPLATE/ # Plantillas de PRs
│
├── .husky/                     # Git hooks
│   ├── pre-commit             # Ejecuta lint-staged
│   └── commit-msg             # Valida formato de commit
│
├── .vscode/                    # Configuración de VS Code
│   ├── extensions.json         # Extensiones recomendadas
│   └── settings.json           # Configuración del proyecto
│
├── docs/                       # Documentación del proyecto
│   ├── 00-project-vision.md
│   ├── 01-business-requirements.md
│   ├── 02-functional-requirements.md
│   ├── 03-non-functional-requirements.md
│   ├── 04-tech-stack.md
│   ├── 05-system-architecture.md
│   ├── 06-folder-structure.md
│   ├── 07-database-design.md
│   ├── 08-authentication.md
│   ├── 09-multi-tenancy.md
│   ├── 10-user-roles.md
│   ├── 11-ui-design-system.md
│   ├── 12-navigation.md
│   ├── 13-module-appointments.md
│   ├── 14-module-digital-menu.md
│   ├── 15-module-crm.md
│   ├── 16-api-design.md
│   ├── 17-security.md
│   ├── 18-deployment.md
│   ├── 19-development-roadmap.md
│   └── 20-coding-standards.md
│
├── public/                     # Assets estáticos (no procesados por Vite)
│   ├── favicon.ico
│   ├── robots.txt
│   ├── manifest.json           # PWA manifest (futuro)
│   └── images/                 # Imágenes estáticas (logos, etc.)
│       ├── logo.svg
│       └── og-image.png        # Open Graph image
│
├── src/                        # Código fuente del frontend
│   ├── app/                    # Configuración global de la app
│   │   ├── router/
│   │   │   ├── index.ts            # Configuración del router
│   │   │   ├── routes.ts           # Definición de rutas (lazy loaded)
│   │   │   └── guards.ts           # Guards de navegación (auth, roles)
│   │   │
│   │   ├── i18n/
│   │   │   ├── index.ts            # Configuración de vue-i18n
│   │   │   ├── messages/           # Traducciones globales
│   │   │   │   ├── en.json
│   │   │   │   ├── es.json
│   │   │   │   └── pt.json
│   │   │   └── locales.ts          # Tipos y utilidades de locale
│   │   │
│   │   ├── plugins/
│   │   │   ├── supabase.ts         # Cliente Supabase inicializado
│   │   │   ├── vuetify.ts          # Tema Vuetify (configurable por tenant)
│   │   │   └── pinia.ts            # Instancia de Pinia
│   │   │
│   │   ├── layouts/
│   │   │   ├── default.vue         # Layout principal (sidebar + header)
│   │   │   ├── auth.vue            # Layout para login/registro
│   │   │   ├── public.vue          # Layout público (carta digital, booking)
│   │   │   └── admin.vue           # Layout para super admin
│   │   │
│   │   ├── App.vue                 # Componente raíz
│   │   └── main.ts                 # Punto de entrada
│   │
│   ├── shared/                     # Código compartido entre módulos
│   │   ├── components/             # Componentes UI reutilizables
│   │   │   ├── AppHeader.vue
│   │   │   ├── AppSidebar.vue
│   │   │   ├── AppFooter.vue
│   │   │   ├── ConfirmDialog.vue
│   │   │   ├── EmptyState.vue
│   │   │   ├── LoadingSpinner.vue
│   │   │   ├── DataTable.vue       # Wrapper de VDataTable con defaults
│   │   │   ├── SearchField.vue
│   │   │   ├── PageHeader.vue
│   │   │   ├── StatusBadge.vue
│   │   │   ├── AvatarUpload.vue
│   │   │   ├── ColorPicker.vue
│   │   │   └── FormSection.vue
│   │   │
│   │   ├── composables/            # Lógica reactiva reutilizable
│   │   │   ├── useAuth.ts          # Estado de autenticación
│   │   │   ├── useTenant.ts        # Estado del tenant actual
│   │   │   ├── usePagination.ts    # Lógica de paginación
│   │   │   ├── useDebounce.ts      # Debounce para búsqueda
│   │   │   ├── useConfirm.ts       # Diálogo de confirmación
│   │   │   ├── useNotification.ts  # Toast/snackbar notifications
│   │   │   ├── useFormValidation.ts
│   │   │   └── usePermission.ts    # Verificación de permisos
│   │   │
│   │   ├── stores/                 # Stores globales
│   │   │   ├── auth.store.ts       # Auth + sesión
│   │   │   ├── tenant.store.ts     # Tenant actual + configuración
│   │   │   └── ui.store.ts         # Estado UI global (sidebar, tema, loading)
│   │   │
│   │   ├── types/                  # Tipos compartidos
│   │   │   ├── auth.types.ts
│   │   │   ├── tenant.types.ts
│   │   │   ├── common.types.ts     # Tipos genéricos (Pagination, ApiResponse, etc.)
│   │   │   ├── user.types.ts
│   │   │   └── index.ts            # Re-exportaciones
│   │   │
│   │   ├── utils/                  # Utilidades generales
│   │   │   ├── format.ts           # Formatos (fecha, moneda, teléfono)
│   │   │   ├── validators.ts       # Funciones de validación
│   │   │   ├── constants.ts        # Constantes globales
│   │   │   └── helpers.ts          # Helpers varios
│   │   │
│   │   └── api/                    # Clientes HTTP y config
│   │       ├── supabase.client.ts  # Cliente supabase-js (singleton)
│   │       ├── axios.client.ts     # Cliente Axios para Edge Functions
│   │       └── interceptors.ts     # Interceptores (auth, error handling)
│   │
│   ├── modules/                    # Módulos de la aplicación
│   │   ├── appointments/           # Módulo: Sistema de Citas
│   │   │   ├── views/              # Páginas del módulo
│   │   │   │   ├── AgendaView.vue
│   │   │   │   ├── ServicesView.vue
│   │   │   │   ├── EmployeesView.vue
│   │   │   │   ├── SchedulesView.vue
│   │   │   │   ├── BookingsView.vue
│   │   │   │   ├── BookingHistoryView.vue
│   │   │   │   └── PublicBookingView.vue  # Portal público de reservas
│   │   │   │
│   │   │   ├── components/         # Componentes del módulo
│   │   │   │   ├── BookingCalendar.vue
│   │   │   │   ├── BookingCard.vue
│   │   │   │   ├── BookingForm.vue
│   │   │   │   ├── ServiceForm.vue
│   │   │   │   ├── ServiceCard.vue
│   │   │   │   ├── EmployeeForm.vue
│   │   │   │   ├── EmployeeSelect.vue
│   │   │   │   ├── ScheduleEditor.vue
│   │   │   │   ├── ScheduleWeekGrid.vue
│   │   │   │   ├── TimeSlotPicker.vue
│   │   │   │   ├── BookingStatusChip.vue
│   │   │   │   └── HolidayCalendar.vue
│   │   │   │
│   │   │   ├── stores/             # Estado del módulo
│   │   │   │   ├── booking.store.ts
│   │   │   │   ├── service.store.ts
│   │   │   │   ├── employee.store.ts
│   │   │   │   └── schedule.store.ts
│   │   │   │
│   │   │   ├── composables/        # Lógica del módulo
│   │   │   │   ├── useBookingForm.ts
│   │   │   │   ├── useAvailability.ts
│   │   │   │   ├── useAgenda.ts
│   │   │   │   └── useScheduleGrid.ts
│   │   │   │
│   │   │   ├── repositories/       # Acceso a datos
│   │   │   │   ├── booking.repository.ts
│   │   │   │   ├── service.repository.ts
│   │   │   │   └── employee.repository.ts
│   │   │   │
│   │   │   ├── types/              # Tipos del módulo
│   │   │   │   ├── booking.types.ts
│   │   │   │   ├── service.types.ts
│   │   │   │   ├── employee.types.ts
│   │   │   │   └── schedule.types.ts
│   │   │   │
│   │   │   └── i18n/               # Traducciones del módulo
│   │   │       ├── en.json
│   │   │       ├── es.json
│   │   │       └── pt.json
│   │   │
│   │   ├── digital-menu/           # Módulo: Carta Digital
│   │   │   ├── views/
│   │   │   │   ├── MenuManagementView.vue
│   │   │   │   ├── CategoriesView.vue
│   │   │   │   ├── ProductsView.vue
│   │   │   │   ├── ProductFormView.vue
│   │   │   │   ├── TablesView.vue
│   │   │   │   ├── OrdersPanelView.vue
│   │   │   │   ├── OrderHistoryView.vue
│   │   │   │   ├── PublicMenuView.vue        # Carta pública del cliente
│   │   │   │   └── PublicOrderTracking.vue    # Seguimiento de pedido
│   │   │   │
│   │   │   ├── components/
│   │   │   │   ├── CategoryList.vue
│   │   │   │   ├── ProductCard.vue
│   │   │   │   ├── ProductDetail.vue
│   │   │   │   ├── ProductForm.vue
│   │   │   │   ├── VariantSelector.vue
│   │   │   │   ├── ExtraSelector.vue
│   │   │   │   ├── CartDrawer.vue
│   │   │   │   ├── CartItem.vue
│   │   │   │   ├── OrderCard.vue
│   │   │   │   ├── OrderStatusTimeline.vue
│   │   │   │   ├── TableCard.vue
│   │   │   │   ├── QRCodeDisplay.vue
│   │   │   │   └── MenuScheduleConfig.vue
│   │   │   │
│   │   │   ├── stores/
│   │   │   │   ├── category.store.ts
│   │   │   │   ├── product.store.ts
│   │   │   │   ├── order.store.ts
│   │   │   │   ├── cart.store.ts
│   │   │   │   └── table.store.ts
│   │   │   │
│   │   │   ├── composables/
│   │   │   │   ├── useCart.ts
│   │   │   │   ├── useOrderTracking.ts
│   │   │   │   ├── useMenuDisplay.ts
│   │   │   │   └── useQRGenerator.ts
│   │   │   │
│   │   │   ├── repositories/
│   │   │   │   ├── category.repository.ts
│   │   │   │   ├── product.repository.ts
│   │   │   │   ├── order.repository.ts
│   │   │   │   └── table.repository.ts
│   │   │   │
│   │   │   ├── types/
│   │   │   │   ├── category.types.ts
│   │   │   │   ├── product.types.ts
│   │   │   │   ├── order.types.ts
│   │   │   │   ├── cart.types.ts
│   │   │   │   └── table.types.ts
│   │   │   │
│   │   │   └── i18n/
│   │   │       ├── en.json
│   │   │       ├── es.json
│   │   │       └── pt.json
│   │   │
│   │   ├── crm/                    # Módulo: CRM
│   │   │   ├── views/
│   │   │   │   ├── CustomerListView.vue
│   │   │   │   ├── CustomerDetailView.vue
│   │   │   │   ├── CustomerFormView.vue
│   │   │   │   ├── TagsManagementView.vue
│   │   │   │   ├── LoyaltyConfigView.vue
│   │   │   │   ├── ClientPortalView.vue     # Portal del cliente
│   │   │   │   └── ClientHistoryView.vue
│   │   │   │
│   │   │   ├── components/
│   │   │   │   ├── CustomerCard.vue
│   │   │   │   ├── CustomerTable.vue
│   │   │   │   ├── CustomerSearch.vue
│   │   │   │   ├── CustomerInfo.vue
│   │   │   │   ├── NoteList.vue
│   │   │   │   ├── NoteForm.vue
│   │   │   │   ├── TagBadge.vue
│   │   │   │   ├── TagSelector.vue
│   │   │   │   ├── VisitHistory.vue
│   │   │   │   ├── LoyaltyCard.vue
│   │   │   │   ├── PointsDisplay.vue
│   │   │   │   └── CustomerStats.vue
│   │   │   │
│   │   │   ├── stores/
│   │   │   │   ├── customer.store.ts
│   │   │   │   ├── tag.store.ts
│   │   │   │   └── loyalty.store.ts
│   │   │   │
│   │   │   ├── composables/
│   │   │   │   ├── useCustomerSearch.ts
│   │   │   │   ├── useCustomerHistory.ts
│   │   │   │   └── useLoyaltyPoints.ts
│   │   │   │
│   │   │   ├── repositories/
│   │   │   │   ├── customer.repository.ts
│   │   │   │   ├── tag.repository.ts
│   │   │   │   └── loyalty.repository.ts
│   │   │   │
│   │   │   ├── types/
│   │   │   │   ├── customer.types.ts
│   │   │   │   ├── tag.types.ts
│   │   │   │   └── loyalty.types.ts
│   │   │   │
│   │   │   └── i18n/
│   │   │       ├── en.json
│   │   │       ├── es.json
│   │   │       └── pt.json
│   │   │
│   │   ├── admin/                  # Módulo: Admin del negocio
│   │   │   ├── views/
│   │   │   │   ├── DashboardView.vue
│   │   │   │   ├── BusinessProfileView.vue
│   │   │   │   ├── TeamManagementView.vue
│   │   │   │   ├── SubscriptionView.vue
│   │   │   │   ├── ModulesConfigView.vue
│   │   │   │   └── SettingsView.vue
│   │   │   │
│   │   │   ├── components/
│   │   │   │   ├── DashboardCard.vue
│   │   │   │   ├── StatsWidget.vue
│   │   │   │   ├── EmployeeInviteForm.vue
│   │   │   │   ├── ModuleToggle.vue
│   │   │   │   ├── PlanCard.vue
│   │   │   │   └── BusinessThemeConfig.vue
│   │   │   │
│   │   │   ├── stores/
│   │   │   │   ├── dashboard.store.ts
│   │   │   │   └── business.store.ts
│   │   │   │
│   │   │   ├── repositories/
│   │   │   │   ├── dashboard.repository.ts
│   │   │   │   └── business.repository.ts
│   │   │   │
│   │   │   ├── types/
│   │   │   │   ├── dashboard.types.ts
│   │   │   │   └── business.types.ts
│   │   │   │
│   │   │   └── i18n/
│   │   │       ├── en.json
│   │   │       ├── es.json
│   │   │       └── pt.json
│   │   │
│   │   └── super-admin/            # Módulo: Super Admin
│   │       ├── views/
│   │       │   ├── TenantsListView.vue
│   │       │   ├── TenantDetailView.vue
│   │       │   ├── PlatformStatsView.vue
│   │       │   ├── AuditLogsView.vue
│   │       │   └── PlansManagementView.vue
│   │       │
│   │       ├── components/
│   │       │   ├── TenantCard.vue
│   │       │   ├── TenantStatusBadge.vue
│   │       │   └── PlatformChart.vue
│   │       │
│   │       ├── stores/
│   │       │   ├── tenants.store.ts
│   │       │   └── platform.store.ts
│   │       │
│   │       ├── repositories/
│   │       │   ├── tenant.repository.ts
│   │       │   └── platform.repository.ts
│   │       │
│   │       ├── types/
│   │       │   └── platform.types.ts
│   │       │
│   │       └── i18n/
│   │           ├── en.json
│   │           ├── es.json
│   │           └── pt.json
│   │
│   ├── assets/                     # Assets procesados por Vite
│   │   ├── styles/
│   │   │   ├── main.scss           # Estilos globales
│   │   │   ├── variables.scss      # Variables SCSS
│   │   │   └── overrides.scss      # Overrides de Vuetify
│   │   └── fonts/                  # Fuentes locales (si no se usan de CDN)
│   │
│   └── styles/                     # Configuración de estilos
│       └── settings.scss           # Ajustes del theme dinámico
│
├── supabase/                       # Configuración y código de Supabase
│   ├── config.toml                 # Configuración del proyecto Supabase
│   ├── seed.sql                    # Datos de semilla para desarrollo
│   │
│   ├── migrations/                 # Migraciones de base de datos
│   │   ├── 20260101000001_create_tenants.sql
│   │   ├── 20260101000002_create_users.sql
│   │   ├── 20260101000003_create_services.sql
│   │   ├── 20260101000004_create_bookings.sql
│   │   ├── 20260101000005_create_categories.sql
│   │   ├── 20260101000006_create_products.sql
│   │   ├── 20260101000007_create_orders.sql
│   │   ├── 20260101000008_create_customers.sql
│   │   └── ...                     # Más migraciones ordenadas
│   │
│   ├── policies/                   # Políticas RLS por tabla
│   │   ├── tenants.policies.sql
│   │   ├── services.policies.sql
│   │   ├── bookings.policies.sql
│   │   ├── products.policies.sql
│   │   ├── orders.policies.sql
│   │   └── customers.policies.sql
│   │
│   ├── triggers/                   # Triggers de PostgreSQL
│   │   ├── booking_audit.sql
│   │   ├── customer_visit.sql
│   │   └── order_status_change.sql
│   │
│   ├── functions/                  # Funciones SQL reutilizables
│   │   ├── get_available_slots.sql
│   │   ├── calculate_loyalty_points.sql
│   │   └── get_customer_stats.sql
│   │
│   └── edge-functions/             # Edge Functions (Deno)
│       ├── _shared/                # Código compartido entre EF
│       │   ├── cors.ts             # Manejo de CORS
│       │   ├── supabase-client.ts  # Cliente Supabase para EF
│       │   └── responses.ts        # Respuestas estándar
│       │
│       ├── notify-appointment-reminder/
│       │   ├── index.ts            # Lógica de la función
│       │   └── test.ts             # Tests
│       │
│       ├── send-order-notification/
│       │   └── index.ts
│       │
│       ├── process-loyalty-points/
│       │   └── index.ts
│       │
│       └── export-csv/
│           └── index.ts
│
├── tests/                          # Tests del frontend
│   ├── unit/                       # Tests unitarios (Vitest)
│   │   ├── shared/
│   │   │   └── utils.test.ts
│   │   └── modules/
│   │       ├── appointments/
│   │       │   └── booking.store.test.ts
│   │       ├── digital-menu/
│   │       │   └── product.store.test.ts
│   │       └── crm/
│   │           └── customer.store.test.ts
│   │
│   ├── components/                 # Tests de componentes (Vue Test Utils)
│   │   └── shared/
│   │       └── ConfirmDialog.test.ts
│   │
│   └── e2e/                        # Tests e2e (Playwright)
│       ├── fixtures/
│       │   └── test-data.ts
│       ├── pages/
│       │   ├── login.page.ts
│       │   ├── booking.page.ts
│       │   └── menu.page.ts
│       ├── specs/
│       │   ├── appointment-flow.spec.ts
│       │   ├── order-flow.spec.ts
│       │   └── crm-flow.spec.ts
│       └── playwright.config.ts
│
├── .env.example                    # Variables de entorno de ejemplo
├── .env.development                # Variables para desarrollo local
├── .env.production                 # Variables para producción
├── .eslintrc.cjs                   # Configuración de ESLint
├── .prettierrc                     # Configuración de Prettier
├── .editorconfig                   # Configuración del editor
├── .gitignore                      # Archivos ignorados por git
├── .lintstagedrc.cjs               # Configuración de lint-staged
├── index.html                      # HTML de entrada
├── vite.config.ts                  # Configuración de Vite
├── tsconfig.json                   # Configuración de TypeScript
├── tsconfig.node.json              # Configuración TS para Node
├── vitest.config.ts                # Configuración de Vitest
├── package.json                    # Dependencias y scripts
├── pnpm-lock.yaml                  # Lockfile (usamos pnpm)
└── README.md                       # README del proyecto
```

---

## Convenciones de Nomenclatura

| Elemento           | Convención                    | Ejemplo                             |
| ------------------ | ----------------------------- | ----------------------------------- |
| Archivos Vue       | PascalCase                    | `BookingCard.vue`                   |
| Stores             | kebab-case + `.store.ts`      | `booking.store.ts`                  |
| Repositories       | kebab-case + `.repository.ts` | `booking.repository.ts`             |
| Composables        | camelCase + prefijo `use`     | `useAvailability.ts`                |
| Types              | kebab-case + `.types.ts`      | `booking.types.ts`                  |
| Traducciones       | Código ISO + `.json`          | `es.json`                           |
| Migraciones        | timestamp + nombre            | `20260101000001_create_tenants.sql` |
| Tests              | nombre + `.test.ts`           | `booking.store.test.ts`             |
| Constantes         | UPPER_SNAKE_CASE              | `MAX_FILE_SIZE`                     |
| Interfaces/Type    | PascalCase                    | `interface Booking`                 |
| Variables          | camelCase                     | `const availableSlots`              |
| Funciones          | camelCase                     | `function fetchBookings()`          |
| Carpetas de módulo | kebab-case                    | `digital-menu`                      |

---

## Archivos de Configuración Clave

### `vite.config.ts`

```typescript
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vuetify from 'vite-plugin-vuetify';

export default defineConfig({
  plugins: [vue(), vuetify({ autoImport: true })],
  resolve: {
    alias: {
      '@': '/src',
      '@shared': '/src/shared',
      '@modules': '/src/modules',
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-vue': ['vue', 'vue-router', 'pinia'],
          'vendor-ui': ['vuetify'],
          'vendor-supabase': ['@supabase/supabase-js'],
        },
      },
    },
  },
});
```

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "jsx": "preserve",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "noEmit": true,
    "paths": {
      "@/*": ["./src/*"],
      "@shared/*": ["./src/shared/*"],
      "@modules/*": ["./src/modules/*"]
    },
    "baseUrl": "."
  },
  "include": ["src/**/*.ts", "src/**/*.d.ts", "src/**/*.vue"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

---

## Gestión de Dependencias

Usamos **pnpm** como gestor de paquetes por su eficiencia (menor uso de disco, instalaciones rápidas, strict mode que previene dependencias no declaradas).

```bash
# Inicializar proyecto
pnpm create vite nexo-platform --template vue-ts

# Dependencias principales
pnpm add vue@3 vue-router@4 pinia@2 vuetify@3 @mdi/font
pnpm add @supabase/supabase-js axios vue-i18n@9 zod date-fns qrcode

# Dependencias de desarrollo
pnpm add -D typescript@5 vite@5 @vitejs/plugin-vue vite-plugin-vuetify
pnpm add -D eslint prettier eslint-plugin-vue @vue/eslint-config-prettier
pnpm add -D husky lint-staged vitest @vue/test-utils jsdom
pnpm add -D @playwright/test supabase
```

---

## Decisiones Tomadas

| Decisión                 | Opción                                     | Alternativas                          | Justificación                                                               |
| ------------------------ | ------------------------------------------ | ------------------------------------- | --------------------------------------------------------------------------- |
| Gestor de paquetes       | pnpm                                       | npm, yarn                             | Más rápido, eficiente en disco, strict mode.                                |
| Nomenclatura de archivos | kebab-case para datos, PascalCase para Vue | camelCase, snake_case                 | Consistencia con convenciones de Vue y TypeScript.                          |
| Organización de módulos  | Todo en una carpeta por módulo             | Por tipo (views, components globales) | Cohesión: lo que cambia junto está junto. Fácil de añadir/eliminar módulos. |
| Migraciones SQL          | Archivos numerados                         | ORM migrations                        | Control total sobre el SQL. Compatible con Supabase CLI.                    |
| Supabase config          | En carpeta `/supabase`                     | Separado en otro repo                 | Todo el proyecto en un mismo repositorio para simplicidad.                  |

---

## Posibles Mejoras Futuras

- **Monorepo** con Nx/Turborepo si el proyecto crece lo suficiente como para justificar la separación en paquetes (shared, backend, frontend).
- **Generación automática de tipos** desde Supabase usando `supabase gen types typescript --local`.
- **Storybook** para el catálogo de componentes compartidos.
- **Changesets** para versionado semántico si se publican paquetes.

---

_Documento generado el: 04/07/2026_
_Versión: 1.0_
_Próximo documento: 07-database-design.md_
