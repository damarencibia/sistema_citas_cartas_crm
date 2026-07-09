# 20 — Coding Standards

## Objetivo

Definir los estándares de codificación, convenciones, buenas prácticas y herramientas de calidad de código que todo el equipo debe seguir para garantizar consistencia, mantenibilidad y calidad en el proyecto.

---

## Alcance

Cubre estándares para TypeScript, Vue 3, CSS/SCSS, SQL, Edge Functions (Deno), testing, commits, y documentación. Se aplica a todo el código del proyecto.

---

## Dependencias

- 04-tech-stack.md — Define las tecnologías del stack.
- 06-folder-structure.md — Define la organización del código.
- 11-ui-design-system.md — Define las convenciones de UI.

---

## Estándares Generales

### Lenguaje

- **Código fuente**: TypeScript estricto en todo el proyecto. Sin JavaScript sin tipo.
- **Comentarios**: No se permiten comentarios superfluos. El código debe ser autoexplicativo con nombres descriptivos. Solo se permiten comentarios JSDoc en funciones públicas de utilidad o APIs.
- **Idioma**: Código en inglés (variables, funciones, tipos, archivos). Texto visible al usuario en archivos de traducción (i18n).

### Formateo

- **Indentación**: 2 espacios (configurado en Prettier).
- **Comillas**: Simples en TypeScript/JavaScript. Dobles en HTML/Vue templates.
- **Punto y coma**: Obligatorio al final de cada statement.
- **Longitud máxima de línea**: 100 caracteres.
- **Salto de línea al final del archivo**: Obligatorio (configurado en Prettier).

---

## TypeScript

### Configuración

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": false,
    "forceConsistentCasingInFileNames": true
  }
}
```

### Convenciones

| Elemento   | Convención                                                            | Ejemplo                                                               |
| ---------- | --------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Interfaces | Prefijo opcional `I` NO usar. Nombre descriptivo.                     | `interface Booking` en lugar de `IBooking`                            |
| Types      | `type` para uniones, tuplas y utilidades.                             | `type BookingStatus = 'confirmed' \| 'completed'`                     |
| Enums      | NO usar enums de TypeScript. Usar `as const` + `type`.                | `const STATUS = { ... } as const; type Status = keyof typeof STATUS;` |
| Genéricos  | Una letra mayúscula para genéricos simples.                           | `<T>`, `<K, V>`                                                       |
| Nombres    | PascalCase para tipos/interfaces. camelCase para variables/funciones. |                                                                       |

### Buenas Prácticas

```typescript
// ✅ CORRECTO: tipos explícitos en funciones públicas
export async function getBookingsByDate(date: string): Promise<Booking[]> {
  const { data } = await supabase
    .from('bookings')
    .select('*')
    .eq('date', date);
  return data ?? [];
}

// ✅ CORRECTO: use const assertions para constantes
export const BOOKING_STATUS = {
  CONFIRMED: 'confirmed',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;
export type BookingStatus = (typeof BOOKING_STATUS)[keyof typeof BOOKING_STATUS];

// ❌ INCORRECTO: any
export async function getData(): Promise<any> { ... }

// ❌ INCORRECTO: enum
export enum Status { Confirmed, Completed }
```

---

## Vue 3

### Composition API

- Usar **Composition API** con `<script setup lang="ts">` en todos los componentes.
- NO usar Options API.
- NO usar `this`.

```vue
<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAuthStore } from '@/shared/stores/auth.store';

const props = defineProps<{
  bookingId: string;
}>();

const emit = defineEmits<{
  (e: 'updated', id: string): void;
}>();

const loading = ref(false);
const authStore = useAuthStore();

const canEdit = computed(() => authStore.isAdmin);

async function save() {
  loading.value = true;
  try {
    // ...
    emit('updated', props.bookingId);
  } finally {
    loading.value = false;
  }
}
</script>
```

### Nombres de Componentes

- **Archivos**: PascalCase (ej: `BookingCard.vue`).
- **Componentes de una palabra**: Evitar. Usar mínimo dos palabras (ej: `BookingCard`, no `Card`).
- **Componentes compartidos**: Prefijo descriptivo sin `App` (ej: `PageHeader`, `DataTable`, `ConfirmDialog`).
- **Componentes de módulo**: Sin prefijo adicional (ej: `BookingCalendar`, no `AppointmentsBookingCalendar`).

### Template

- **v-for** siempre acompañado de `:key` único.
- **v-if** y **v-for** nunca en el mismo elemento (envolver con `<template>`).
- **Eventos**: Usar kebab-case para emit events (ej: `@update:model-value`).
- **Props**: Definir tipos explícitos con `defineProps`.

```vue
<template>
  <v-card>
    <template v-for="item in items" :key="item.id">
      <v-card-item v-if="item.isActive">
        {{ item.name }}
      </v-card-item>
    </template>
  </v-card>
</template>
```

### Store (Pinia)

- Usar **setup syntax** (composition API) para stores.
- Una store por archivo, nombrada `{entidad}.store.ts`.
- Usar `defineStore` con nombre único en formato `{module}/{entity}`.

```typescript
export const useBookingStore = defineStore('appointments/bookings', () => {
  const bookings = ref<Booking[]>([]);
  const fetchBookings = async () => { ... };
  return { bookings, fetchBookings };
});
```

---

## CSS / SCSS

- Usar Vuetify classes siempre que sea posible. Evitar CSS personalizado.
- Cuando sea necesario CSS personalizado, usar SCSS.
- Nombres de clases: kebab-case.
- No usar `!important`.
- Preferir `gap` sobre `margin` en layouts flex/grid.
- Usar variables de Vuetify para colores y espaciado.

```scss
// ❌ INCORRECTO
.custom-class {
  margin-top: 16px;
  color: #1976d2;
}

// ✅ CORRECTO
.custom-class {
  margin-top: map.get($spacing, 'md');
  color: rgb(var(--v-theme-primary));
}
```

---

## SQL

- Nombres de tablas: snake_case, plural.
- Nombres de columnas: snake_case.
- Comandos SQL: MAYÚSCULAS (`SELECT`, `FROM`, `WHERE`).
- Usar parámetros con nombre en funciones.
- Una migración por archivo, ordenada por timestamp.

```sql
-- ✅ CORRECTO
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  customer_name VARCHAR(200) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bookings_tenant_date ON bookings(tenant_id, date);

-- ❌ INCORRECTO
create table Bookings (
  Id UUID PRIMARY KEY
);
```

---

## Edge Functions (Deno)

- Una función por carpeta.
- Código compartido en `_shared/`.
- Validar JWT al inicio de cada función.
- Respuestas en formato JSON estándar.
- Manejo de errores con try/catch.

```typescript
import { createSupabaseClient } from '../_shared/supabase-client.ts';

Deno.serve(async (req) => {
  try {
    const supabase = createSupabaseClient(req);
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401,
      });
    }
    // ... lógica
    return new Response(JSON.stringify({ success: true, data: result }), { status: 200 });
  } catch (err) {
    console.error('Error:', err);
    return new Response(JSON.stringify({ success: false, error: 'Internal Server Error' }), {
      status: 500,
    });
  }
});
```

---

## Testing

### Convenciones

| Elemento | Convención                                                          |
| -------- | ------------------------------------------------------------------- |
| Archivos | `{nombre}.test.ts`                                                  |
| Describe | `describe('BookingStore', () => { ... })`                           |
| It       | `it('should fetch bookings by date', async () => { ... })`          |
| Mock     | Prefijo `mock` en variables mockeadas: `const mockBookings = [...]` |

### Estructura de Tests

```typescript
// tests/unit/modules/appointments/booking.store.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useBookingStore } from '@/modules/appointments/stores/booking.store';

describe('BookingStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('should initialize with empty bookings', () => {
    const store = useBookingStore();
    expect(store.bookings).toEqual([]);
  });

  it('should fetch bookings by date', async () => {
    const store = useBookingStore();
    // Mock repository
    // await store.fetchBookings('2026-01-15');
    // expect(store.bookings.length).toBeGreaterThan(0);
  });
});
```

### Cobertura Mínima

| Tipo                                                  | Cobertura                   |
| ----------------------------------------------------- | --------------------------- |
| Lógica de negocio (stores, composables, repositories) | > 90%                       |
| Componentes Vue                                       | > 80%                       |
| Edge Functions                                        | > 90%                       |
| Políticas RLS                                         | 100% (tests de integración) |

---

## Commits

### Formato (Conventional Commits)

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

| Type       | Uso                                                        |
| ---------- | ---------------------------------------------------------- |
| `feat`     | Nueva funcionalidad                                        |
| `fix`      | Corrección de bug                                          |
| `refactor` | Cambio de código que no añade funcionalidad ni corrige bug |
| `style`    | Cambios de formato, linting                                |
| `test`     | Añadir o modificar tests                                   |
| `docs`     | Cambios en documentación                                   |
| `chore`    | Tareas de mantenimiento, configuraciones                   |
| `perf`     | Mejora de rendimiento                                      |

### Ejemplos

```
feat(appointments): add public booking portal
fix(crm): prevent duplicate customer on concurrent requests
refactor(shared): extract pagination logic to composable
test(cart): add unit tests for cart total calculation
docs: update deployment guide with new environment variables
```

### Reglas

- Commits en **inglés**.
- Línea de asunto: máximo 72 caracteres, imperativo, sin punto final.
- Un commit = un cambio lógico atómico.
- NO commits con mensajes como "fix", "update", "changes".

---

## Git Flow

### Ramas

| Rama             | Propósito                        | Desde     | Fusionar a         |
| ---------------- | -------------------------------- | --------- | ------------------ |
| `main`           | Producción                       | —         | —                  |
| `develop`        | Integración de desarrollo        | `main`    | `main`             |
| `feature/{desc}` | Nueva funcionalidad              | `develop` | `develop`          |
| `fix/{desc}`     | Corrección de bug                | `develop` | `develop`          |
| `hotfix/{desc}`  | Corrección urgente en producción | `main`    | `main` + `develop` |

### Flujo

```
1. Crear rama desde develop: git checkout -b feature/booking-calendar
2. Trabajar y commitear
3. Push y crear PR a develop
4. PR revisado por al menos 1 persona del equipo
5. Merge a develop
6. Cuando develop está estable, PR a main
```

### Política de PRs

- Título descriptivo: `feat(appointments): add booking calendar component`.
- Descripción con contexto y screenshots si aplica.
- Checklist de verificación (tests, lint, typecheck).
- Al menos 1 approval requerido.
- Sin merge directo a `main` sin PR.

---

## ESLint y Prettier

### ESLint

```javascript
// .eslintrc.cjs
module.exports = {
  root: true,
  env: { browser: true, es2022: true, node: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:vue/vue3-recommended',
    '@vue/eslint-config-prettier',
  ],
  parser: 'vue-eslint-parser',
  parserOptions: {
    parser: '@typescript-eslint/parser',
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    'vue/multi-word-component-names': 'error',
    'vue/component-name-in-template-casing': ['error', 'PascalCase'],
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/explicit-function-return-type': 'off',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
};
```

### Prettier

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "all",
  "printWidth": 100,
  "bracketSpacing": true,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

---

## Organización de Imports

Orden de imports en archivos TypeScript/Vue:

```typescript
// 1. Librerías externas
import { ref, computed } from 'vue';
import { useRoute } from 'vue-router';

// 2. Módulos internos (shared primero, luego módulos)
import { useAuthStore } from '@/shared/stores/auth.store';
import { formatCurrency } from '@/shared/utils/format';
import { useBookingStore } from '@/modules/appointments/stores/booking.store';
import { bookingRepository } from '@/modules/appointments/repositories/booking.repository';

// 3. Componentes (solo en Vue)
import BookingCard from './BookingCard.vue';

// 4. Tipos
import type { Booking } from '@/modules/appointments/types/booking.types';
```

---

## Manejo de Errores

```typescript
// ✅ CORRECTO: errores manejados con try/catch
async function saveBooking() {
  try {
    loading.value = true;
    error.value = null;
    await bookingRepository.create(formData);
    showSuccessMessage('Cita creada exitosamente');
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Error al crear la cita';
    showErrorMessage(error.value);
  } finally {
    loading.value = false;
  }
}

// ✅ CORRECTO: errores de validación manejados localmente
const validationErrors = ref<Record<string, string>>({});
function validateForm() {
  const result = bookingSchema.safeParse(formData);
  if (!result.success) {
    validationErrors.value = Object.fromEntries(
      result.error.issues.map((i) => [i.path.join('.'), i.message]),
    );
    return false;
  }
  return true;
}
```

---

## Documentación del Código

- **JSDoc**: Solo para funciones públicas de `shared/utils/` y repositories.

```typescript
/**
 * Formatea un valor numérico a moneda local.
 * @param amount - Monto en centavos (ej: 1500 = $15.00)
 * @param currency - Código de moneda ISO (default: 'MXN')
 * @returns String formateado (ej: "$15.00")
 */
export function formatCurrency(amount: number, currency = 'MXN'): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
  }).format(amount / 100);
}
```

---

## Checklist de Calidad Pre-Commit

Antes de cada commit, verificar:

- [ ] `pnpm lint` pasa sin errores.
- [ ] `pnpm typecheck` pasa sin errores.
- [ ] `pnpm test:unit` pasa.
- [ ] No hay `console.log` en código de producción.
- [ ] No hay `any` en TypeScript.
- [ ] Los nombres de variables/funciones son descriptivos.
- [ ] No hay código comentado.
- [ ] Los archivos nuevos siguen las convenciones de nomenclatura.
- [ ] Las traducciones están en los archivos i18n correspondientes.
- [ ] El mensaje de commit sigue Conventional Commits.

---

## Decisiones Tomadas

| Decisión                   | Opción                 | Alternativas                | Justificación                                                              |
| -------------------------- | ---------------------- | --------------------------- | -------------------------------------------------------------------------- |
| TypeScript estricto        | `strict: true`         | Modo no estricto            | Previene errores en tiempo de compilación. Mejor documentación del código. |
| Composition API            | `<script setup>`       | Options API                 | Más limpio, mejor inferencia de tipos, mejor rendimiento.                  |
| Conventional Commits       | Formato estándar       | Commits libres              | Generación automática de changelog. Facilita la revisión.                  |
| Sin comentarios superfluos | Código autoexplicativo | Comentarios extensos        | El código cambia, los comentarios se vuelven obsoletos.                    |
| Sin `any`                  | Error de ESLint        | Permitido en casos extremos | `any` rompe la seguridad de tipos. Siempre hay una alternativa tipada.     |

---

## Posibles Mejoras Futuras

- **Code generation**: Generar stores, repositories y tipos automáticamente desde las tablas de Supabase.
- **OpenAPI spec**: Documentación de API generada desde el código.
- **Storybook**: Catálogo de componentes con documentación visual.
- **Gráficos de dependencias**: Herramienta visual para ver dependencias entre módulos.
- **Template de PR**: Automatizar checklist con GitHub Actions.
- **Análisis estático avanzado**: SonarQube para calidad de código.

---

_Documento generado el: 04/07/2026_
_Versión: 1.0_
_Fin de la serie de documentación._
