# 18 — Deployment

## Objetivo

Definir la estrategia de despliegue, los entornos, el pipeline de CI/CD, la configuración de Vercel y Supabase, las variables de entorno, y el proceso de release management.

---

## Alcance

Cubre el pipeline de CI/CD con GitHub Actions, la configuración de entornos (desarrollo, staging, producción), el despliegue del frontend en Vercel, la gestión de migraciones de Supabase, la configuración de dominios y el monitoreo post-despliegue.

---

## Dependencias

- 04-tech-stack.md — Define Vercel y Supabase como plataformas de despliegue.
- 17-security.md — Define los headers de seguridad y configuración de CSP.

---

## Estrategia de Entornos

| Entorno         | Propósito                      | URL                                   | Base de datos        | Despliegue          |
| --------------- | ------------------------------ | ------------------------------------- | -------------------- | ------------------- |
| **Development** | Desarrollo local del equipo    | `http://localhost:5173`               | Supabase local (CLI) | `npm run dev`       |
| **Preview**     | Testing por PR                 | `https://pr-{number}.nexo.vercel.app` | Supabase staging     | Automático por PR   |
| **Staging**     | QA y validación pre-producción | `https://staging.nexo.app`            | Supabase staging     | Manual desde `main` |
| **Production**  | Usuarios finales               | `https://nexo.app`                    | Supabase production  | Manual con approval |

---

## Pipeline de CI/CD (GitHub Actions)

### Workflow: CI (Push y PR)

```yaml
# .github/workflows/ci.yml
name: CI
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm lint
      - run: pnpm typecheck

  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm test:unit

  e2e-tests:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm exec playwright install --with-deps
      - run: pnpm test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7

  rls-policy-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
        with:
          version: latest
      - run: supabase start
      - run: supabase db push
      - run: pnpm test:rls # Tests específicos de políticas RLS
```

### Workflow: Deploy a Staging

```yaml
# .github/workflows/deploy-staging.yml
name: Deploy to Staging
on:
  push:
    branches: [main]

jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm build

      # Desplegar frontend en Vercel (Staging)
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
          scope: ${{ secrets.VERCEL_ORG_ID }}

      # Desplegar migraciones de Supabase
      - uses: supabase/setup-cli@v1
        with:
          version: latest
      - run: supabase link --project-ref ${{ secrets.SUPABASE_STAGING_REF }}
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
      - run: supabase db push
```

### Workflow: Deploy a Production

```yaml
# .github/workflows/deploy-production.yml
name: Deploy to Production
on:
  workflow_dispatch: # Manual trigger con approval
    inputs:
      version:
        description: 'Version tag (ej: v1.2.3)'
        required: true

jobs:
  deploy-production:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm build

      # Desplegar frontend en Vercel (Production)
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
          scope: ${{ secrets.VERCEL_ORG_ID }}

      # Desplegar migraciones de Supabase
      - uses: supabase/setup-cli@v1
        with:
          version: latest
      - run: supabase link --project-ref ${{ secrets.SUPABASE_PROD_REF }}
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
      - run: supabase db push

      # Desplegar Edge Functions
      - run: supabase functions deploy --project-ref ${{ secrets.SUPABASE_PROD_REF }}
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}

      # Crear tag de release
      - uses: actions/github-script@v7
        with:
          script: |
            github.rest.git.createRef({
              owner: context.repo.owner,
              repo: context.repo.repo,
              ref: 'refs/tags/${{ github.event.inputs.version }}',
              sha: context.sha
            });
```

---

## Configuración de Vercel

### vercel.json

```json
{
  "framework": "vite",
  "buildCommand": "pnpm build",
  "outputDirectory": "dist",
  "devCommand": "pnpm dev",
  "installCommand": "pnpm install",
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=31536000; includeSubDomains; preload"
        },
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' https://*.supabase.co data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co; frame-ancestors 'none';"
        }
      ]
    }
  ],
  "redirects": [
    { "source": "/appointments", "destination": "/appointments/agenda", "permanent": true },
    { "source": "/digital-menu", "destination": "/digital-menu/orders", "permanent": true },
    { "source": "/crm", "destination": "/crm/customers", "permanent": true }
  ],
  "rewrites": [{ "source": "/public/:slug/:path*", "destination": "/index.html" }]
}
```

### Variables de Entorno en Vercel

| Variable                 | Desarrollo               | Staging                    | Producción                | Secreta |
| ------------------------ | ------------------------ | -------------------------- | ------------------------- | ------- |
| `VITE_SUPABASE_URL`      | `http://localhost:54321` | `https://xxx.supabase.co`  | `https://xxx.supabase.co` | No      |
| `VITE_SUPABASE_ANON_KEY` | Anon key local           | Anon key staging           | Anon key prod             | No      |
| `VITE_APP_URL`           | `http://localhost:5173`  | `https://staging.nexo.app` | `https://nexo.app`        | No      |
| `VITE_SENTRY_DSN`        | —                        | DSN staging                | DSN prod                  | Sí      |
| `VITE_RESEND_API_KEY`    | —                        | API key staging            | API key prod              | Sí      |

---

## Configuración de Supabase

### Proyectos

| Entorno    | Proyecto       | Uso                           |
| ---------- | -------------- | ----------------------------- |
| Desarrollo | Local (CLI)    | `supabase start`              |
| Staging    | `nexo-staging` | Proyecto separado en Supabase |
| Producción | `nexo-prod`    | Proyecto separado en Supabase |

### Migraciones

Las migraciones se aplican automáticamente en el pipeline de CI/CD:

```bash
# Desarrollo local
supabase start          # Inicia Supabase local
supabase db diff        # Genera migración desde cambios locales
supabase db push        # Aplica migraciones a la DB local

# Staging / Producción
supabase db push        # Aplica migraciones a la DB remota
```

**Principios de migraciones**:

1. Una migración nunca se modifica después de aplicada.
2. Las migraciones son incrementales y ordenadas por timestamp.
3. Las migraciones de rollback se crean cuando sea necesario.
4. Las migraciones se revisan en PR antes de aplicarse a producción.

### Edge Functions

Las Edge Functions se despliegan con el CLI de Supabase:

```bash
# Despliegue individual
supabase functions deploy send-booking-confirmation

# Despliegue de todas las funciones
supabase functions deploy

# Variables de entorno para Edge Functions
supabase secrets set RESEND_API_KEY=xxx
supabase secrets set SENDGRID_API_KEY=xxx
```

### Políticas RLS

Las políticas RLS se incluyen en las migraciones y se aplican junto con ellas. Se prueban automáticamente en CI.

---

## Monitoreo Post-Despliegue

### Frontend (Vercel Analytics)

- **Web Vitals**: LCP, FID, CLS en tiempo real.
- **Rendimiento por ruta**: Tiempo de carga de cada vista.
- **Errores del frontend**: Capturados por Sentry.
- **Uso de la aplicación**: Páginas más visitadas, flujo de usuarios.

### Backend / Edge Functions

- **Logs de Edge Functions**: Disponibles en Supabase Dashboard.
- **Métricas de base de datos**: Consultas lentas, conexiones activas, tamaño de la DB.
- **Errores de API**: Códigos de error 4xx/5xx monitoreados.

### Alertas

| Alerta                  | Condición                           | Canal         |
| ----------------------- | ----------------------------------- | ------------- |
| Uptime degradado        | < 99.9% en 5 minutos                | Email + Slack |
| Errores 5xx > 1%        | Más del 1% de solicitudes con error | Email + Slack |
| Consultas lentas        | Queries > 1 segundo                 | Email         |
| Uso de almacenamiento   | > 80% del límite del plan           | Email         |
| Error crítico en Sentry | Error con frecuencia > 10/min       | Email + Slack |

---

## Release Process

### Versionado

Usamos **Semantic Versioning** (SemVer):

```
MAJOR.MINOR.PATCH (ej: 1.3.0)

MAJOR: Cambios incompatibles en API o base de datos.
MINOR: Nuevas funcionalidades compatibles hacia atrás.
PATCH: Bug fixes, cambios menores.
```

### Proceso de Release

```
1. Desarrollo en rama `develop`
2. PR a `main` → CI ejecuta tests + lint + typecheck
3. Merge a `main` → Deploy automático a staging
4. QA verifica en staging
5. Tags: git tag v1.2.3 && git push --tags
6. GitHub Release: crear release con changelog
7. Deploy manual a producción (workflow_dispatch)
8. Monitoreo post-despliegue (30 minutos)
9. Si hay issues: revert o hotfix (rama desde main)
```

### Hotfix Process

```
1. Rama `hotfix/descripcion` desde `main`
2. Fix y PR directo a `main`
3. CI ejecuta tests
4. Aprobación rápida
5. Deploy a producción
6. Merge hotfix también a `develop`
```

---

## Scripts de package.json

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc --noEmit && vite build",
    "preview": "vite preview",
    "lint": "eslint . --max-warnings 0",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write \"src/**/*.{ts,vue,scss}\"",
    "typecheck": "vue-tsc --noEmit",
    "test:unit": "vitest run",
    "test:unit:watch": "vitest",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:rls": "vitest run --config vitest.rls.config.ts",
    "test": "pnpm lint && pnpm typecheck && pnpm test:unit",
    "prepare": "husky"
  }
}
```

---

## Decisiones Tomadas

| Decisión            | Opción                         | Alternativas                     | Justificación                                                                       |
| ------------------- | ------------------------------ | -------------------------------- | ----------------------------------------------------------------------------------- |
| CI/CD               | GitHub Actions                 | GitLab CI, CircleCI              | Misma plataforma que el repositorio. Integración nativa.                            |
| Despliegue frontend | Vercel Action                  | Manual CLI, Docker               | Automatizado en CI. Preview deployments por PR.                                     |
| Entornos            | Dev + Preview + Staging + Prod | Solo Dev + Prod                  | Preview es crítico para revisar cambios en PR. Staging para QA antes de producción. |
| Migraciones DB      | Supabase CLI push              | ORM migrations, scripts manuales | Integración nativa con Supabase. Control de versiones de schema.                    |
| Deploy a producción | Manual (workflow_dispatch)     | Automático al mergear a main     | Control humano antes de desplegar a producción. Permite coordinar con el equipo.    |
| Versionado          | SemVer                         | CalVer                           | Estándar en la industria. Claridad sobre el impacto de cada release.                |

---

## Posibles Mejoras Futuras

- **Feature flags**: Desplegar funcionalidades inactivas y activarlas con flags (LaunchDarkly, Flagsmith).
- **Canary deployments**: Desplegar a un porcentaje de usuarios primero.
- **Rollback automático**: Si las métricas empeoran después del despliegue, revertir automáticamente.
- **Infraestructura como código**: Terraform o Pulumi para gestionar Vercel y Supabase.
- **Dashboard de despliegues**: Historial de despliegues con cambios, autor, tiempo.
- **Notificaciones de despliegue**: Slack/email al equipo cuando se despliega a producción.
- **Database branching**: Crear rama de base de datos por PR para pruebas aisladas.

---

_Documento generado el: 04/07/2026_
_Versión: 1.0_
_Próximo documento: 19-development-roadmap.md_
