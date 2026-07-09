# 08 — Authentication

## Objetivo

Definir el sistema de autenticación de la plataforma, incluyendo registro, inicio de sesión, manejo de sesiones, proveedores OAuth, control de acceso basado en JWT e integración con Supabase Auth y RLS.

---

## Alcance

Cubre la autenticación de todos los actores del sistema: Super Administrador, Propietario, Administrador, Empleado y Cliente. Incluye el flujo de registro de negocios, invitación de empleados y autenticación pública.

---

## Dependencias

- 04-tech-stack.md — Define Supabase Auth como proveedor de autenticación.
- 05-system-architecture.md — Define el flujo JWT + RLS.
- 07-database-design.md — Define las tablas `users`, `tenants`, `customers` y las relaciones con Supabase Auth.
- 09-multi-tenancy.md — Define cómo el tenant_id se inyecta en el JWT.

---

## Arquitectura de Autenticación

```
┌──────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   Frontend       │         │  Supabase Auth   │         │  PostgreSQL     │
│   (Vue 3 SPA)    │         │  (JWT Provider)  │         │  + RLS          │
│                  │         │                  │         │                 │
│  1. Login form   │────────>│  2. Validate     │────────>│  4. RLS check   │
│  3. Store JWT    │<────────│  + Return JWT    │<────────│  tenant_id =    │
│  6. Attach JWT   │         │  with claims:    │         │  JWT.tenant_id  │
│  to requests     │         │  • tenant_id     │         │                 │
│                  │         │  • role          │         │                 │
│                  │         │  • user_id       │         │                 │
└──────────────────┘         └──────────────────┘         └─────────────────┘
```

---

## Proveedor: Supabase Auth

Supabase Auth es el sistema de autenticación. Proporciona:

- Registro con email + contraseña
- Inicio de sesión con email + contraseña
- Magic links (sin contraseña)
- OAuth social (Google, Facebook, Apple — para clientes)
- Recuperación de contraseña
- JWT con custom claims
- Sesiones persistentes con refresh token
- Integración nativa con RLS

**No usamos**:

- Supabase Auth UI (personalizamos los formularios con Vuetify)
- Phone auth (SMS) inicialmente (se puede añadir después)
- Multi-factor authentication inicialmente (se añade después)

---

## JWT Claims

El JWT de Supabase Auth se enriquece con custom claims mediante un **Hook de Autenticación** (trigger SQL que se ejecuta al crear/modificar un usuario).

### Estructura del JWT

```json
{
  "sub": "uuid-del-usuario-en-supabase-auth",
  "email": "user@example.com",
  "app_metadata": {
    "provider": "email",
    "tenant_id": "uuid-del-tenant",
    "role": "owner",
    "is_super_admin": false
  },
  "user_metadata": {
    "first_name": "Juan",
    "last_name": "Pérez"
  },
  "exp": 1700000000,
  "iat": 1699996400
}
```

### Claims personalizados

| Claim                         | Origen        | Propósito                                                 |
| ----------------------------- | ------------- | --------------------------------------------------------- |
| `app_metadata.tenant_id`      | Tabla `users` | Identifica el tenant del usuario. NULL para super admins. |
| `app_metadata.role`           | Tabla `users` | Rol del usuario en el sistema.                            |
| `app_metadata.is_super_admin` | Tabla `users` | Flag para super administradores.                          |

### Inyección de Claims vía Trigger

```sql
-- Esta función se ejecuta como hook de autenticación en Supabase
CREATE OR REPLACE FUNCTION handle_user_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_role VARCHAR(20);
  v_is_super_admin BOOLEAN;
BEGIN
  -- Buscar el usuario en nuestra tabla users
  SELECT tenant_id, role, is_super_admin
  INTO v_tenant_id, v_role, v_is_super_admin
  FROM users
  WHERE supabase_user_id = NEW.id;

  -- Establecer custom claims
  NEW.raw_app_meta_data = jsonb_build_object(
    'provider', COALESCE(NEW.raw_app_meta_data->>'provider', 'email'),
    'tenant_id', v_tenant_id,
    'role', COALESCE(v_role, 'employee'),
    'is_super_admin', COALESCE(v_is_super_admin, false)
  );

  RETURN NEW;
END;
$$;
```

---

## Flujos de Autenticación

### Flujo 1: Registro de Negocio (Propietario)

```
1. Usuario completa formulario de registro en /register
   → email, contraseña, nombre del negocio

2. Frontend valida datos localmente (Zod)

3. Frontend llama a Supabase Auth:
   supabase.auth.signUp({ email, password })

4. Supabase crea usuario (estado: pendiente verificación email)

5. Hook AFTER INSERT en auth.users:
   a. Crea registro en tabla tenants (con slug generado del nombre)
   b. Crea registro en tabla users con role='owner'
   c. Inyecta tenant_id y role en app_metadata del JWT

6. Se envía email de verificación al usuario

7. Usuario verifica email (hace clic en link)

8. Supabase actualiza el usuario a verificado

9. Frontend: mostrar mensaje de éxito + redirigir a login

10. (Opcional) Edge Function crea configuración inicial:
    - Servicios de ejemplo precargados
    - Horarios por defecto
    - Tags predefinidas para CRM
```

### Flujo 2: Inicio de Sesión (Propietario/Admin/Empleado)

```
1. Usuario completa formulario de login en /login
   → email, contraseña, recordar sesión

2. Frontend: supabase.auth.signInWithPassword({ email, password })

3. Supabase Auth valida credenciales

4. Si éxito:
   a. Devuelve JWT con custom claims (tenant_id, role)
   b. Devuelve refresh token

5. Si fallo:
   a. Error: "Email o contraseña incorrectos"
   b. Si 5 intentos fallidos: bloqueo temporal (lo maneja Supabase)

6. Frontend:
   a. Almacena sesión (HttpOnly cookie si es posible, o memory)
   b. Carga datos del tenant (logo, nombre, colores)
   c. Redirige al dashboard según rol:
      - owner/admin → Dashboard del negocio
      - employee → Agenda del día (citas) o panel de pedidos
      - super_admin → Panel de administración de plataforma

7. Frontend configura el cliente supabase con la sesión:
   supabase.auth.setSession({ access_token, refresh_token })
```

### Flujo 3: Invitación de Empleado

```
1. Admin/propietario completa formulario de invitación
   → nombre, email, rol (admin/employee)

2. Frontend: Edge Function 'invite-employee'
   a. Valida que el usuario actual tiene permiso (owner/admin)
   b. Crea registro en tabla employees
   c. Llama a Supabase Admin API:
      supabase.auth.admin.inviteUserByEmail(email, {
        data: { tenant_id, role, first_name, last_name }
      })
   d. Envía email de invitación con link de acceso

3. Invitado recibe email con link

4. Invitado hace clic en link → /accept-invite?token=xxx

5. Invitado establece su contraseña

6. Supabase Auth crea el usuario

7. Hook AFTER INSERT:
   a. Crea registro en tabla users con tenant_id y rol
   b. Actualiza el registro en employees con user_id

8. Invitado puede iniciar sesión
```

### Flujo 4: Autenticación de Cliente

```
Opción A: Sin cuenta (guest)
1. Cliente agenda cita o hace pedido sin registrarse
2. Frontend envía datos sin autenticación (anon key de Supabase)
3. RLS permite INSERT en bookings/orders con validaciones
4. El cliente recibe email/link para ver/cancelar su cita
5. Este link contiene un token de acceso temporal (signed URL)

Opción B: Con cuenta
1. Cliente se registra con email + contraseña o Google OAuth
2. Cliente creado en una tabla separada de usuarios del negocio
3. Autenticación contra Supabase Auth
4. JWT con tenant_id del negocio y role='customer'
5. El cliente solo puede acceder a sus propios datos
```

### Flujo 5: Recuperación de Contraseña

```
1. Usuario hace clic en "¿Olvidaste tu contraseña?" en /login

2. Frontend: supabase.auth.resetPasswordForEmail(email)

3. Supabase envía email con link de recuperación

4. Usuario hace clic en link → /reset-password#access_token=xxx

5. Frontend detecta access_token en la URL y actualiza la sesión

6. Usuario ingresa nueva contraseña

7. Frontend: supabase.auth.updateUser({ password: newPassword })

8. Confirmación de cambio exitoso
```

---

## Manejo de Sesión en el Frontend

### Store de Auth (`shared/stores/auth.store.ts`)

```typescript
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { supabase } from '@/app/plugins/supabase';
import type { User, Session } from '@supabase/supabase-js';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const session = ref<Session | null>(null);
  const loading = ref(true);

  const isAuthenticated = computed(() => !!session.value);
  const tenantId = computed(() => session.value?.user?.app_metadata?.tenant_id ?? null);
  const role = computed(() => session.value?.user?.app_metadata?.role ?? null);
  const isSuperAdmin = computed(() => session.value?.user?.app_metadata?.is_super_admin ?? false);
  const isOwner = computed(() => role.value === 'owner');
  const isAdmin = computed(() => role.value === 'admin' || role.value === 'owner');
  const isEmployee = computed(() => ['owner', 'admin', 'employee'].includes(role.value));

  async function initialize() {
    loading.value = true;
    // Obtener sesión actual
    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession();
    session.value = currentSession;
    user.value = currentSession?.user ?? null;

    // Escuchar cambios en la autenticación
    supabase.auth.onAuthStateChange((event, newSession) => {
      session.value = newSession;
      user.value = newSession?.user ?? null;
    });

    loading.value = false;
  }

  async function login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async function logout() {
    await supabase.auth.signOut();
    session.value = null;
    user.value = null;
  }

  return {
    user,
    session,
    loading,
    isAuthenticated,
    tenantId,
    role,
    isSuperAdmin,
    isOwner,
    isAdmin,
    isEmployee,
    initialize,
    login,
    logout,
  };
});
```

### Inicialización en `App.vue`

```typescript
// En App.vue o main.ts
const authStore = useAuthStore();
await authStore.initialize();

// Configurar interceptor de Axios para incluir JWT
axios.interceptors.request.use(async (config) => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});
```

---

## Guards de Ruta (Vue Router)

| Ruta                    | Guard                                         | Redirección si no autenticado |
| ----------------------- | --------------------------------------------- | ----------------------------- |
| `/login`, `/register`   | `redirectIfAuthenticated`                     | `/dashboard`                  |
| `/dashboard`            | `requireAuth`                                 | `/login`                      |
| `/appointments/*`       | `requireAuth + requireModule('appointments')` | `/dashboard`                  |
| `/digital-menu/*`       | `requireAuth + requireModule('digital_menu')` | `/dashboard`                  |
| `/crm/*`                | `requireAuth + requireModule('crm')`          | `/dashboard`                  |
| `/admin/*`              | `requireAuth + requireAdmin`                  | `/dashboard`                  |
| `/super-admin/*`        | `requireAuth + requireSuperAdmin`             | `/login`                      |
| `/public/:slug/booking` | `publicAccess`                                | Ninguna (página pública)      |
| `/public/:slug/menu`    | `publicAccess`                                | Ninguna (página pública)      |

### Implementación de Guards

```typescript
// app/router/guards.ts
export const requireAuth = async (to, from, next) => {
  const authStore = useAuthStore();
  if (!authStore.isAuthenticated) {
    return next({ path: '/login', query: { redirect: to.fullPath } });
  }
  next();
};

export const requireAdmin = async (to, from, next) => {
  const authStore = useAuthStore();
  if (!authStore.isAdmin) {
    return next({ path: '/dashboard' });
  }
  next();
};

export const requireSuperAdmin = async (to, from, next) => {
  const authStore = useAuthStore();
  if (!authStore.isSuperAdmin) {
    return next({ path: '/login' });
  }
  next();
};

export const requireModule = (moduleName: string) => {
  return async (to, from, next) => {
    const tenantStore = useTenantStore();
    if (!tenantStore.modules[moduleName]) {
      return next({ path: '/dashboard' });
    }
    next();
  };
};
```

---

## Edge Functions y Autenticación

Las Edge Functions reciben el JWT en el header `Authorization` y lo validan para identificar al usuario y tenant.

```typescript
// supabase/edge-functions/_shared/supabase-client.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export function createSupabaseClient(req: Request) {
  const authHeader = req.headers.get('Authorization')!;
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  return createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
}

// Uso en la función:
export async function handler(req: Request) {
  const supabase = createSupabaseClient(req);

  // Obtener usuario autenticado
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const tenantId = user?.app_metadata?.tenant_id;
  const role = user?.app_metadata?.role;
}
```

---

## Consideraciones de Seguridad

| Aspecto                  | Implementación                                                                                                                                                          |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Almacenamiento de tokens | El JWT se almacena en memoria (variable reactiva). No se guarda en localStorage para prevenir XSS. Supabase maneja el refresh token en HttpOnly cookie automáticamente. |
| HTTPS                    | Obligatorio en toda la comunicación. Vercel y Supabase lo proporcionan por defecto.                                                                                     |
| Expiración de sesión     | JWT expira en 1 hora. Refresh token expira en 30 días. Si no hay actividad en 2 horas, se cierra la sesión.                                                             |
| Rate limiting            | 5 intentos de login por minuto por IP (Supabase lo maneja).                                                                                                             |
| Verificación de email    | Obligatoria antes del primer inicio de sesión.                                                                                                                          |
| Revocación de sesión     | Al cambiar contraseña, todas las sesiones existentes se revocan.                                                                                                        |
| CORS                     | Restringido al dominio de Vercel (producción) y localhost (desarrollo).                                                                                                 |
| API Keys                 | La anon key de Supabase es pública (está en el frontend). La seguridad se basa en RLS, no en secretos.                                                                  |

---

## Registro de Eventos de Autenticación

Todos los eventos de autenticación se registran en `audit_logs`:

| Evento                     | Registrado                          |
| -------------------------- | ----------------------------------- |
| Login exitoso              | Sí (user_id, timestamp, IP)         |
| Login fallido              | Sí (email, timestamp, IP)           |
| Logout                     | Sí (user_id, timestamp)             |
| Registro de nuevo tenant   | Sí (tenant_id, owner_id, timestamp) |
| Invitación de empleado     | Sí (quién invitó, a quién, rol)     |
| Cambio de contraseña       | Sí (user_id, timestamp)             |
| Recuperación de contraseña | Sí (email, timestamp)               |

---

## Decisiones Tomadas

| Decisión              | Opción                    | Alternativas                       | Justificación                                                                                                |
| --------------------- | ------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Proveedor de Auth     | Supabase Auth             | Auth0, Clerk, Firebase Auth        | Integración nativa con RLS, PostgreSQL y el resto de Supabase. Menos dependencias externas.                  |
| Custom claims en JWT  | Hook de autenticación SQL | Edge Function, Supabase Auth hooks | El hook SQL se ejecuta en la base de datos, sin latencia de red. Es la forma recomendada por Supabase.       |
| Almacenamiento de JWT | Memoria + HttpOnly cookie | localStorage, sessionStorage       | localStorage es vulnerable a XSS. HttpOnly cookie es más segura. Supabase maneja el refresh automáticamente. |
| Registro de clientes  | Opcional (guest + cuenta) | Solo cuentas, solo guest           | Balance entre conversión (guest es más rápido) y retención (cuenta permite historial y fidelización).        |
| Autenticación social  | Solo Google inicialmente  | Google + Facebook + Apple          | Google es el más común. Los demás se añaden según demanda.                                                   |

---

## Posibles Mejoras Futuras

- **Multi-factor authentication (MFA)**: Código TOTP para propietarios y admins como capa adicional de seguridad.
- **Magic links**: Permitir inicio de sesión sin contraseña mediante email.
- **SSO (Single Sign-On)**: Para empresas que quieran usar su propio proveedor de identidad (SAML, OIDC).
- **Biometric authentication**: En dispositivos móviles (futura app nativa).
- **Session management UI**: Para que los usuarios vean y cierren sesiones activas en otros dispositivos.
- **WebAuthn / Passkeys**: Autenticación sin contraseña con llaves de paso.

---

_Documento generado el: 04/07/2026_
_Versión: 1.0_
_Próximo documento: 09-multi-tenancy.md_
