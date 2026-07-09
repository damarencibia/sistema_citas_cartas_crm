# 04 — Tech Stack

## Objetivo

Definir y justificar cada tecnología seleccionada para el proyecto, incluyendo versiones, propósito y alternativas consideradas.

---

## Alcance

Cubre todas las tecnologías del stack: frontend, backend, base de datos, hosting, herramientas de desarrollo y servicios externos.

---

## Dependencias

- 00-project-vision.md — Define los principios de simplicidad, producción-ready y stack.
- 03-non-functional-requirements.md — Define los atributos de calidad que el stack debe satisfacer.

---

## Stack Completo

### Frontend

| Tecnología     | Versión | Propósito              | Justificación                                                                                                                                                                                                      |
| -------------- | ------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Vue 3**      | 3.4+    | Framework frontend     | Reactividad eficiente con Composition API, ecosistema maduro, TypeScript nativo, tamaño de bundle reducido. Preferido sobre React por su menor complejidad y mejor rendimiento en aplicaciones SPA de este tamaño. |
| **TypeScript** | 5.4+    | Lenguaje               | Tipado estático que previene errores en tiempo de compilación, mejora la documentación del código, permite refactors seguros. Obligatorio en todo el proyecto.                                                     |
| **Vite**       | 5.x     | Bundler / Dev server   | Extremadamente rápido gracias a ESBuild y Rollup. Hot Module Replacement nativo. Configuración mínima. Es el bundler recomendado para Vue 3.                                                                       |
| **Vuetify**    | 3.x     | UI Component Library   | Más de 80 componentes Material Design listos para producción. Responsive por defecto. Excelente integración con Vue 3. Accesibilidad incorporada. Tema personalizable por tenant (colores).                        |
| **Pinia**      | 2.x     | Estado global          | Store type-safe y modular. Soporte DevTools. Sintaxis simple comparada con Vuex. Arquitectura modular por defecto con stores independientes.                                                                       |
| **Vue Router** | 4.x     | Enrutamiento           | Router oficial de Vue. Lazy loading nativo. Guards de navegación. Nested routes para la estructura modular.                                                                                                        |
| **vue-i18n**   | 9.x     | Internacionalización   | Estándar de facto para i18n en Vue. Lazy loading de traducciones. Soporte para pluralización, formato de fechas/números.                                                                                           |
| **Axios**      | 1.x     | HTTP Client            | Para comunicación con Supabase Edge Functions. Interceptores para manejo de tokens y errores. Alternativa: fetch nativo (menos features).                                                                          |
| **Zod**        | 3.x     | Validación de esquemas | Validación en runtime con inferencia de tipos TypeScript. Se usa para validar datos de entrada en el frontend y en Edge Functions. Alternativa: Yup (más pesado).                                                  |
| **date-fns**   | 3.x     | Manejo de fechas       | Librería funcional y tree-shakeable. Alternativa: Moment.js (deprecado), Day.js (menos funcionalidades).                                                                                                           |

### Backend

| Tecnología                  | Versión        | Propósito                     | Justificación                                                                                                                                                                                                      |
| --------------------------- | -------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Supabase**                | Última estable | Backend como servicio (BaaS)  | Proporciona PostgreSQL, Auth, Storage, Realtime y Edge Functions en una plataforma integrada. Plan gratuito generoso. Elimina la necesidad de gestionar servidores. API REST y cliente JavaScript nativo.          |
| **PostgreSQL**              | 15+            | Base de datos relacional      | La base de datos más avanzada y confiable. Soporte nativo de RLS para multi-tenancy. JSONB para datos flexibles. Extensiones como pgcrypto, pg_stat_statements.                                                    |
| **Supabase Auth**           | —              | Autenticación                 | Manejo completo de registro, login, recuperación de contraseña, sesiones JWT, OAuth (Google, Facebook, Apple). Integración directa con RLS.                                                                        |
| **Supabase Storage**        | —              | Almacenamiento de archivos    | Para logos, imágenes de productos, etc. CDN integrada. Políticas de acceso basadas en RLS. Límites de almacenamiento por plan.                                                                                     |
| **Supabase Realtime**       | —              | Tiempo real                   | Basado en WebSockets y la extensión `pg_websockets` de PostgreSQL. Permite suscripciones a cambios en tablas. Esencial para notificaciones de pedidos en tiempo real.                                              |
| **Supabase Edge Functions** | —              | Lógica de servidor serverless | Escritas en Deno (TypeScript). Se usan para lógica de negocio que no puede ejecutarse solo con RLS: validaciones complejas, notificaciones, procesamiento de pagos futuro. Se ejecutan en el edge (baja latencia). |
| **Deno**                    | 1.x            | Runtime de Edge Functions     | Integrado en Supabase Edge Functions. TypeScript nativo, seguro por defecto (sin acceso al sistema de archivos sin permiso).                                                                                       |

### Hosting y Despliegue

| Tecnología           | Versión | Propósito                         | Justificación                                                                                                                                                                              |
| -------------------- | ------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Vercel**           | —       | Hosting frontend                  | Despliegue continuo desde Git. CDN global con más de 100 ubicaciones. Soporte nativo para Vue + Vite. Preview deployments por PR. Sin configuración de servidores. Plan gratuito generoso. |
| **Vercel Analytics** | —       | Monitoreo de rendimiento frontend | Web Vitals en tiempo real. Datos de rendimiento por ruta y dispositivo. Integración nativa con Vercel.                                                                                     |
| **GitHub**           | —       | Control de versiones              | Repositorio de código. GitHub Actions para CI/CD. Project management con Issues y Projects.                                                                                                |

### Herramientas de Desarrollo

| Tecnología            | Versión | Propósito              | Justificación                                                                                                                                                                         |
| --------------------- | ------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **VS Code**           | Última  | Editor de código       | El editor más utilizado para TypeScript/Vue. Extensiones recomendadas: Vue Language Features (Volar), TypeScript Vue Plugin, ESLint, Prettier, Tailwind CSS IntelliSense (si aplica). |
| **ESLint**            | 8.x     | Linter                 | Reglas de calidad y estilo de código. Integración con Prettier. Configuración compartida en el proyecto.                                                                              |
| **Prettier**          | 3.x     | Formateador            | Formateo consistente. Sin discusiones de estilo. Integración con ESLint.                                                                                                              |
| **Husky**             | 9.x     | Git hooks              | Pre-commit hooks para ejecutar linter y tests antes de cada commit.                                                                                                                   |
| **lint-staged**       | 15.x    | Linting en staged      | Ejecuta ESLint y Prettier solo en archivos modificados para commits rápidos.                                                                                                          |
| **Vitest**            | 1.x     | Testing unitario       | Testing nativo de Vite. Extremadamente rápido. Compatible con Jest API.                                                                                                               |
| **Vue Test Utils**    | 2.x     | Testing de componentes | Librería oficial para testing de componentes Vue 3.                                                                                                                                   |
| **Playwright**        | 1.x     | Testing e2e            | Tests cross-browser. Soporta Chrome, Firefox, Safari. Generación de código, video y screenshots en fallos.                                                                            |
| **Supabase CLI**      | Última  | Desarrollo local       | Ejecutar Supabase localmente. Migraciones de base de datos. Generación de tipos TypeScript.                                                                                           |
| **pgAdmin / DBeaver** | —       | Cliente PostgreSQL     | Gestión visual de la base de datos para desarrollo.                                                                                                                                   |

### Servicios Externos

| Servicio                  | Propósito                       | Justificación                                                                                                                                                                                        |
| ------------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Resend** o **SendGrid** | Envío de emails transaccionales | Confirmaciones de registro, confirmaciones de citas, recordatorios, recuperación de contraseña. Se seleccionará según costo y facilidad de integración. Resend tiene SDK para Deno (Edge Functions). |
| **Twilio** o **AWS SNS**  | Envío de SMS                    | Notificaciones SMS opcionales para recordatorios de citas. Se integra como feature opcional (el negocio decide si lo activa y paga).                                                                 |
| **Sentry**                | Monitoreo de errores            | Captura de errores del frontend y Edge Functions. Alertas en tiempo real. Contexto de usuario y tenant en cada error.                                                                                |

---

## Decisiones por Capa

### ¿Por qué Supabase y no un backend tradicional?

| Aspecto               | Supabase                               | Backend tradicional (Node.js + Express)               |
| --------------------- | -------------------------------------- | ----------------------------------------------------- |
| Gestión de servidores | Zero (serverless)                      | Requiere servidor (AWS, Railway, etc.)                |
| Base de datos         | PostgreSQL gestionado                  | Requiere configuración y mantenimiento                |
| Autenticación         | Integrada con RLS                      | Requiere implementación propia (Passport, JWT manual) |
| Almacenamiento        | Integrado con RLS                      | Requiere S3 + CDN configurados                        |
| Tiempo real           | Integrado (WebSockets)                 | Requiere Socket.io + Redis                            |
| Escalabilidad         | Automática                             | Requiere configuración manual                         |
| Costo inicial         | Gratuito (hasta 500MB DB, 2GB storage) | Depende del hosting (Heroku, Railway, etc.)           |

**Decisión**: Supabase elimina la sobrecarga operativa de mantener un backend, permitiendo enfocarse en el producto. PostgreSQL estándar garantiza que no hay vendor lock-in: si en el futuro se necesita migrar, PostgreSQL se ejecuta en cualquier parte.

### ¿Por qué Vuetify y no Tailwind + componentes propios?

- **Vuetify** proporciona 80+ componentes listos para producción (datatables, diálogos, calendarios, formularios) que serían muy lentos de implementar desde cero.
- **Tailwind** requiere construir cada componente manualmente o usar una librería de componentes headless.
- Para un SaaS que necesita módulos complejos (agenda, carta digital, CRM) con deadline ajustado, Vuetify acelera significativamente el desarrollo.
- El theming de Vuetify permite personalizar colores por tenant (requisito BR-008).

### ¿Por qué Axios y no el cliente nativo de Supabase?

- El cliente `supabase-js` se usa para operaciones directas de base de datos desde el frontend (vía RLS).
- Axios se usa específicamente para invocar Edge Functions que requieren lógica de negocio que no puede ejecutarse solo con RLS.
- El cliente Supabase y Axios coexisten: cada uno tiene su propósito.

### ¿Por qué Edge Functions y no un backend separado?

- Las Edge Functions de Supabase se ejecutan en Deno, en el edge (baja latencia).
- Están integradas con el proyecto de Supabase, no requieren infraestructura separada.
- Se usan **solo cuando es necesario**: cuando RLS no es suficiente (ej: validación de disponibilidad compleja, envío de emails, procesamiento de pagos).
- La mayoría de las operaciones se resuelven con RLS + queries directas desde el frontend.

---

## Versiones Mínimas de Navegadores Soportados

```json
{
  "browserslist": ["> 1%", "last 2 versions", "not dead", "not ie 11"]
}
```

Navegadores soportados:

- Chrome >= 90
- Firefox >= 90
- Safari >= 15
- Edge >= 90

---

## Stack Visual

```
┌─────────────────────────────────────────────────────┐
│                     Vercel                           │
│  ┌──────────────────────────────────────────────┐   │
│  │            Frontend (Vue 3 + Vite)            │   │
│  │  ┌─────────┐ ┌──────────┐ ┌──────────────┐  │   │
│  │  │ Vuetify │ │  Pinia   │ │  Vue Router   │  │   │
│  │  └─────────┘ └──────────┘ └──────────────┘  │   │
│  │  ┌─────────┐ ┌──────────┐ ┌──────────────┐  │   │
│  │  │ vue-i18n│ │  Axios   │ │ supabase-js  │  │   │
│  │  └─────────┘ └──────────┘ └──────────────┘  │   │
│  └──────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────┘
                       │ HTTPS
┌──────────────────────▼──────────────────────────────┐
│                    Supabase                          │
│  ┌────────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │ PostgreSQL │ │   Auth   │ │     Storage      │  │
│  │  + RLS     │ │  (JWT)   │ │  (S3 + CDN)      │  │
│  └────────────┘ └──────────┘ └──────────────────┘  │
│  ┌────────────────┐ ┌──────────────────────────┐   │
│  │   Realtime     │ │    Edge Functions (Deno)   │   │
│  │  (WebSockets)  │ │    (solo cuando necesario) │   │
│  └────────────────┘ └──────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

---

## Decisiones Tomadas

| Decisión       | Opción              | Alternativas                   | Justificación                                                                                          |
| -------------- | ------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------ |
| Cliente HTTP   | Axios + supabase-js | Solo supabase-js, fetch nativo | Cada uno para su propósito: supabase-js para DB directa, Axios para Edge Functions.                    |
| Validación     | Zod                 | Yup, Joi, Valibot              | Zod tiene mejor inferencia de tipos TypeScript. Es el estándar en el ecosistema Deno (Edge Functions). |
| Fechas         | date-fns            | Day.js, Luxon                  | date-fns es tree-shakeable (importar solo lo necesario). Mayor cobertura de funcionalidades.           |
| Testing e2e    | Playwright          | Cypress                        | Playwright es más rápido, soporta múltiples navegadores nativamente, y tiene mejor integración con CI. |
| Notificaciones | Resend (email)      | SendGrid, Mailgun              | Resend tiene SDK nativo para Deno (Edge Functions). API simple. Precio competitivo.                    |

---

## Posibles Mejoras Futuras

- **Nuxt 3** en lugar de Vue 3 puro si se necesita SSR/SSG para SEO del lado público.
- **Tailwind CSS** combinado con Vuetify si se requieren estilos muy personalizados.
- **tRPC** como alternativa a Axios para APIs type-safe.
- **Cloudflare Workers** para Edge Functions si la escala supera los límites de Supabase.
- **Vercel Edge Functions** como complemento si se necesita lógica en el edge del frontend.
- **Redis** para caché distribuida si la carga de lectura supera la capacidad de PostgreSQL.

---

_Documento generado el: 04/07/2026_
_Versión: 1.0_
_Próximo documento: 05-system-architecture.md_
