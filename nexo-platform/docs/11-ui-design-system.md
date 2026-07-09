# 11 — UI Design System

## Objetivo

Definir el sistema de diseño de la interfaz de usuario, incluyendo temas, colores, tipografía, componentes base, patrones de diseño, espaciado y principios de experiencia de usuario (UX).

---

## Alcance

Cubre el sistema de diseño visual de la plataforma. Incluye el uso de Vuetify como librería base, la personalización de temas, los componentes compartidos, los patrones de layout y las guías de estilo para desarrollo frontend.

---

## Dependencias

- 04-tech-stack.md — Define Vuetify 3 como librería de componentes UI.
- 06-folder-structure.md — Define la ubicación de los componentes compartidos.
- 10-user-roles.md — Define qué elementos UI se muestran según el rol.

---

## Principios de Diseño

1. **Mobile-first**: Todo diseño comienza desde la pantalla más pequeña (320px) y escala hacia arriba.
2. **Consistencia**: Mismos componentes, mismos patrones en toda la aplicación.
3. **Claridad**: Cada elemento tiene un propósito claro. Sin decoración innecesaria.
4. **Feedback**: Cada acción del usuario tiene una respuesta visual inmediata.
5. **Accesibilidad**: WCAG 2.1 AA como mínimo. Contraste suficiente, navegación por teclado, roles ARIA.
6. **Velocidad percibida**: Skeleton screens, transiciones suaves, carga progresiva.

---

## Tema Base (Vuetify)

Vuetify proporciona un sistema de temas basado en Material Design. El tema se personaliza a nivel de aplicación y luego se sobreescribe por tenant.

### Colores Base

| Variable     | Color             | Hex       | Uso                                             |
| ------------ | ----------------- | --------- | ----------------------------------------------- |
| `primary`    | Azul              | `#1976D2` | Botones principales, enlaces, headers           |
| `secondary`  | Gris oscuro       | `#424242` | Elementos secundarios, badges                   |
| `accent`     | Ámbar             | `#FFA726` | Destacados, ofertas, notificaciones importantes |
| `success`    | Verde             | `#4CAF50` | Estados exitosos, completado                    |
| `warning`    | Naranja           | `#FF9800` | Advertencias, pendiente                         |
| `error`      | Rojo              | `#F44336` | Errores, cancelado, no-show                     |
| `info`       | Azul claro        | `#2196F3` | Información general                             |
| `background` | Blanco/gris claro | `#F5F5F5` | Fondo de la aplicación                          |
| `surface`    | Blanco            | `#FFFFFF` | Tarjetas, modales, menús                        |

### Personalización por Tenant

Cada tenant puede personalizar los colores primario y secundario desde la configuración de su negocio. Esto se implementa mediante el theming dinámico de Vuetify.

```typescript
// app/plugins/vuetify.ts
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';

export function createVuetifyInstance(tenantColors?: { primary: string; secondary: string }) {
  return createVuetify({
    components,
    directives,
    theme: {
      defaultTheme: 'custom',
      themes: {
        custom: {
          dark: false,
          colors: {
            primary: tenantColors?.primary ?? '#1976D2',
            secondary: tenantColors?.secondary ?? '#424242',
            accent: '#FFA726',
            success: '#4CAF50',
            warning: '#FF9800',
            error: '#F44336',
            info: '#2196F3',
            background: '#F5F5F5',
            surface: '#FFFFFF',
          },
        },
      },
    },
    defaults: {
      VBtn: { rounded: 'lg', elevation: 0 },
      VCard: { rounded: 'lg', elevation: 1 },
      VTextField: { variant: 'outlined', density: 'comfortable' },
      VSelect: { variant: 'outlined', density: 'comfortable' },
      VDialog: { rounded: 'lg' },
      VSnackbar: { rounded: 'lg' },
    },
  });
}
```

### Modo Oscuro

El modo oscuro se implementa como tema alternativo de Vuetify. Se puede activar desde la UI (toggle del usuario) o automáticamente según la preferencia del sistema.

```typescript
theme: {
  defaultTheme: 'custom',
  themes: {
    custom: { /* ... claro ... */ },
    customDark: {
      dark: true,
      colors: {
        primary: tenantColors?.primary ?? '#1976D2',
        secondary: tenantColors?.secondary ?? '#424242',
        background: '#121212',
        surface: '#1E1E1E',
        // ...
      },
    },
  },
}
```

---

## Tipografía

Usamos la fuente **Inter** como principal y **Roboto** como fallback (incluida en Vuetify).

```css
/* src/assets/styles/variables.scss */
$font-family: 'Inter', 'Roboto', sans-serif;
$heading-font-family: 'Inter', 'Roboto', sans-serif;

// Jerarquía tipográfica
$h1-size: 2rem;
$h2-size: 1.5rem;
$h3-size: 1.25rem;
$h4-size: 1rem;
$body-size: 0.875rem;
$caption-size: 0.75rem;
```

### Jerarquía

| Elemento   | Tamaño          | Peso            | Uso                          |
| ---------- | --------------- | --------------- | ---------------------------- |
| `h1`       | 2rem (32px)     | Bold (700)      | Título de página             |
| `h2`       | 1.5rem (24px)   | Semi-bold (600) | Título de sección            |
| `h3`       | 1.25rem (20px)  | Semi-bold (600) | Título de tarjeta/formulario |
| `h4`       | 1rem (16px)     | Medium (500)    | Subtítulo                    |
| `body-1`   | 0.875rem (14px) | Regular (400)   | Texto principal              |
| `body-2`   | 0.875rem (14px) | Medium (500)    | Texto destacado              |
| `caption`  | 0.75rem (12px)  | Regular (400)   | Texto auxiliar               |
| `overline` | 0.625rem (10px) | Uppercase       | Labels, badges               |

---

## Componentes Compartidos

Los componentes compartidos están en `src/shared/components/` y se usan en todos los módulos.

### `PageHeader`

Header de cada página con título, subtítulo y acciones.

```vue
<PageHeader title="Servicios" subtitle="Gestiona los servicios que ofrece tu negocio">
  <template #actions>
    <v-btn color="primary" @click="openForm">
      <v-icon start>mdi-plus</v-icon>
      Nuevo servicio
    </v-btn>
  </template>
</PageHeader>
```

### `DataTable`

Wrapper de `v-data-table` con configuración predeterminada (paginación, búsqueda, ordenamiento, selección).

```vue
<DataTable
  :headers="headers"
  :items="services"
  :loading="loading"
  search-label="Buscar servicios..."
  @edit="handleEdit"
  @delete="handleDelete"
>
  <template #item.price="{ item }">
    {{ formatCurrency(item.price) }}
  </template>
</DataTable>
```

### `ConfirmDialog`

Diálogo de confirmación reutilizable.

```vue
<ConfirmDialog
  v-model="showDeleteDialog"
  title="¿Eliminar servicio?"
  message="Esta acción no se puede deshacer."
  confirm-text="Eliminar"
  confirm-color="error"
  @confirm="deleteService"
/>
```

### `EmptyState`

Estado vacío para listas sin datos.

```vue
<EmptyState
  icon="mdi-calendar-blank"
  title="No hay citas hoy"
  description="Las citas programadas aparecerán aquí"
  action-text="Agendar primera cita"
  @action="openBookingForm"
/>
```

### `StatusBadge`

Badge de estado con color configurable.

```vue
<StatusBadge
  :status="booking.status"
  :map="{
    confirmed: { color: 'info', text: 'Confirmada' },
    in_progress: { color: 'warning', text: 'En curso' },
    completed: { color: 'success', text: 'Completada' },
    cancelled: { color: 'error', text: 'Cancelada' },
    no_show: { color: 'grey', text: 'No asistió' },
  }"
/>
```

### `LoadingSpinner`

Indicador de carga con slot para mensaje personalizado.

### `SearchField`

Campo de búsqueda con debounce y limpieza.

```vue
<SearchField v-model="search" placeholder="Buscar clientes..." :loading="searching" />
```

---

## Patrones de Layout

### Layout Principal (Default)

```
┌─────────────┬──────────────────────────────────────────┐
│             │                                          │
│   Sidebar   │            Page Content                  │
│   (Nav)     │                                          │
│             │  ┌────────────────────────────────────┐  │
│   Logo      │  │  PageHeader (título + acciones)    │  │
│             │  ├────────────────────────────────────┤  │
│   Módulos   │  │                                    │  │
│             │  │  Main Content (router-view)         │  │
│   - Citas   │  │                                    │  │
│   - Menú    │  │                                    │  │
│   - CRM     │  │                                    │  │
│             │  └────────────────────────────────────┘  │
│   Perfil    │                                          │
│             │                                          │
└─────────────┴──────────────────────────────────────────┘
    256px                Resto del viewport
```

- **Sidebar**: Colapsable en móvil (se convierte en menú hamburguesa).
- **Header**: Título de página + breadcrumbs + acciones.
- **Content**: Área principal con scroll.

### Layout Público

```
┌────────────────────────────────────────────────────────┐
│                                                        │
│   Minimal header (logo + nombre del negocio)           │
│                                                        │
├────────────────────────────────────────────────────────┤
│                                                        │
│   Main Content (carta digital / formulario reserva)     │
│                                                        │
│                                                        │
├────────────────────────────────────────────────────────┤
│                                                        │
│   Footer minimal (redes sociales, dirección)           │
│                                                        │
└────────────────────────────────────────────────────────┘
```

- **Sin sidebar**: El layout público es minimalista y centrado en el contenido.
- **Header**: Solo logo y nombre del negocio, con selector de idioma.
- **Responsive**: Ocupa el 100% del viewport en móvil.

---

## Espaciado y Grid

Usamos el sistema de espaciado de Vuetify (basado en un factor de 4px).

| Clase   | Píxeles | Uso                          |
| ------- | ------- | ---------------------------- |
| `pa-1`  | 4px     | Padding mínimo               |
| `pa-2`  | 8px     | Padding interno de tablas    |
| `pa-3`  | 12px    | Padding de inputs            |
| `pa-4`  | 16px    | Padding estándar de tarjetas |
| `pa-6`  | 24px    | Padding de secciones         |
| `pa-8`  | 32px    | Padding de página            |
| `gap-4` | 16px    | Gap entre elementos de grid  |

**Grid**: Usamos el sistema de grid de Vuetify (`v-row` / `v-col`) con 12 columnas.

```vue
<v-row>
  <v-col cols="12" sm="6" md="4" lg="3">
    <v-card>...</v-card>
  </v-col>
</v-row>
```

**Breakpoints**:

| Breakpoint | Ancho         | Dispositivo              |
| ---------- | ------------- | ------------------------ |
| `xs`       | < 600px       | Móvil                    |
| `sm`       | 600 - 959px   | Tablet pequeño           |
| `md`       | 960 - 1279px  | Tablet / Desktop pequeño |
| `lg`       | 1280 - 1919px | Desktop                  |
| `xl`       | >= 1920px     | Desktop grande           |

---

## Patrones de Interacción

### Formularios

- Todos los formularios usan `v-form` con validación.
- Los campos obligatorios tienen asterisco (*).
- El botón de submit está deshabilitado mientras el formulario no sea válido.
- Los formularios de creación tienen modo "crear" y "editar" (mismo componente).
- Feedback de error inmediato (on blur).

### Tablas

- Paginación (20 items por página).
- Ordenamiento por columnas (click en header).
- Búsqueda (filtro global con debounce de 300ms).
- Selección múltiple con checkbox (acciones masivas).
- Exportación a CSV (cuando aplique).

### Diálogos

- Confirmación antes de acciones destructivas.
- Los diálogos no se cierran al hacer clic fuera si hay datos sin guardar.
- Diálogos de creación/edición son de tamaño `sm` (max-width 600px).
- Los formularios dentro de diálogos tienen scroll interno si son largos.

### Notificaciones

- **Snackbars** para confirmaciones y errores (duración: 3s éxito, 6s error).
- **Banners** para información persistente (ej: "Estás en periodo de prueba").
- **Badges** en el sidebar para notificaciones de nuevos pedidos.

### Estados de Carga

- **Skeleton loaders** para carga de listas y tarjetas.
- **Progress linear** en la parte superior para carga de página.
- **Spinner** para acciones puntuales (guardar, eliminar).
- **Transiciones** suaves entre rutas (fade).

---

## Iconos

Usamos **Material Design Icons** (`@mdi/font`) que vienen incluidos con Vuetify.

```vue
<v-icon>mdi-calendar</v-icon>
<v-icon>mdi-food</v-icon>
<v-icon>mdi-account-group</v-icon>
```

---

## Responsive Design

| Componente  | xs (<600px)             | sm (600-959)         | md+ (960+)        |
| ----------- | ----------------------- | -------------------- | ----------------- |
| Sidebar     | Oculto (hamburguesa)    | Oculto (hamburguesa) | Visible           |
| DataTable   | Vista tipo tarjeta      | Vista tipo tarjeta   | Tabla completa    |
| PageHeader  | Título + botón flotante | Título + botón       | Título + acciones |
| Formularios | Una columna             | Una columna          | Dos columnas      |
| Cards       | 1 por fila              | 2 por fila           | 3-4 por fila      |

---

## Accesibilidad

- **Contraste**: Todas las combinaciones de color cumplen WCAG AA (ratio ≥ 4.5:1 para texto normal).
- **Teclado**: Todos los elementos interactivos son accesibles por teclado (Tab, Enter, Escape).
- **ARIA**: Roles y atributos ARIA en componentes personalizados.
- **Focus**: Indicador de foco visible en todos los elementos.
- **Textos alternativos**: En todas las imágenes (logo, productos, avatares).
- **Tamaño de fuente**: Respetamos el zoom del navegador (no usamos unidades fijas que impidan escalar).

---

## Consistencia Visual

Para garantizar consistencia, todas las páginas siguen la misma estructura:

1. **PageHeader**: Título, subtítulo, acciones principales.
2. **Filtros/Búsqueda**: Si la página tiene listado.
3. **Contenido**: Tabla, cards, formularios.
4. **Paginación**: Si aplica.

---

## Decisiones Tomadas

| Decisión           | Opción                      | Alternativas                   | Justificación                                                                                 |
| ------------------ | --------------------------- | ------------------------------ | --------------------------------------------------------------------------------------------- |
| Librería UI        | Vuetify 3                   | Quasar, PrimeVue, Element Plus | Mejor integración con Vue 3, Material Design, theming dinámico, responsive por defecto.       |
| Iconos             | Material Design Icons       | Font Awesome, Heroicons        | Compatibilidad nativa con Vuetify. Mayor variedad de iconos.                                  |
| Tipografía         | Inter + Roboto              | Poppins, Open Sans             | Inter es moderna, legible en pantalla, buena hinting. Roboto como fallback viene con Vuetify. |
| Tema dinámico      | Vuetify theme               | CSS custom properties          | Vuetify lo soporta nativamente. Cambia colores de todos los componentes automáticamente.      |
| Modo oscuro        | Tema alternativo Vuetify    | CSS personalizado              | Integración nativa. Un toggle cambia todo el tema.                                            |
| Tablas responsivas | Vista tipo tarjeta en móvil | Tabla con scroll horizontal    | Las tarjetas son más legibles en móvil que las tablas con scroll.                             |

---

## Posibles Mejoras Futuras

- **Storybook**: Catálogo completo de componentes con documentación interactiva.
- **Pruebas de accesibilidad automatizadas**: Con axe-core + Playwright.
- **Modo quiosco**: Para tablets en negocios (interfaz simplificada).
- **Animaciones avanzadas**: Transiciones entre rutas, micro-interacciones.
- **Tema oscuro automático**: Según hora del día o preferencia del sistema.
- **Personalización avanzada por tenant**: Fuente, bordes redondeados, espaciado.
- **Generación de PDF**: Para menús imprimibles, informes, etc.

---

_Documento generado el: 04/07/2026_
_Versión: 1.0_
_Próximo documento: 12-navigation.md_
