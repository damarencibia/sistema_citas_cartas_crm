# 10 — User Roles & Permissions

## Objetivo

Definir los roles del sistema, sus permisos, la matriz de acceso a funcionalidades y cómo se implementa el control de acceso en cada capa (frontend, RLS, Edge Functions).

---

## Alcance

Cubre los 5 roles del sistema: Super Administrador, Propietario, Administrador, Empleado y Cliente. Incluye permisos CRUD por módulo, acceso a vistas, y validación en frontend y base de datos.

---

## Dependencias

- 01-business-requirements.md — Define las necesidades de cada actor.
- 05-system-architecture.md — Define cómo la autorización se implementa mediante RLS.
- 08-authentication.md — Define cómo el rol se inyecta en el JWT.
- 09-multi-tenancy.md — Define cómo el tenant_id se combina con el rol para autorización.

---

## Roles del Sistema

| Rol                 | ID en DB      | Alcance    | Descripción                                                                                                             |
| ------------------- | ------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------- |
| Super Administrador | `super_admin` | Global     | Personal interno de Nexo Platform. Acceso total a todos los tenantes y funcionalidades de administración de plataforma. |
| Propietario         | `owner`       | Por tenant | Dueño del negocio. Acceso completo a la configuración y datos de su tenant. Solo puede haber uno por tenant.            |
| Administrador       | `admin`       | Por tenant | Personal de gestión. Acceso a funciones operativas sin acceso a configuración de pago o plan.                           |
| Empleado            | `employee`    | Por tenant | Personal operativo. Acceso limitado a funciones del día a día según su asignación.                                      |
| Cliente             | `customer`    | Por tenant | Usuario final. Solo acceso a sus propios datos (citas, pedidos, perfil).                                                |

---

## Matriz de Permisos

### Convenciones

- **C** = Crear (Create)
- **R** = Leer (Read)
- **U** = Actualizar (Update)
- **D** = Eliminar (Delete / Desactivar)
- **—** = Sin acceso

### Módulo Base

| Funcionalidad                           | Super Admin | Propietario | Admin | Empleado | Cliente |
| --------------------------------------- | :---------: | :---------: | :---: | :------: | :-----: |
| Ver dashboard del negocio               |      R      |      R      |   R   |    R     |    —    |
| Configurar perfil del negocio           |    CRUD     |    CRUD     |   —   |    —     |    —    |
| Ver logs de auditoría                   |    CRUD     |      R      |   R   |    —     |    —    |
| Gestionar módulos (activar/desactivar)  |    CRUD     |    CRUD     |   —   |    —     |    —    |
| Gestionar suscripción y plan            |    CRUD     |    CRUD     |   —   |    —     |    —    |
| Gestionar empleados                     |    CRUD     |    CRUD     | CRUD  |    —     |    —    |
| Ver su propio perfil                    |     RU      |     RU      |  RU   |    RU    |    —    |
| Gestionar tenants (super admin)         |    CRUD     |      —      |   —   |    —     |    —    |
| Ver estadísticas globales (super admin) |      R      |      —      |   —   |    —     |    —    |

### Módulo: Citas

| Funcionalidad                              | Super Admin | Propietario | Admin |   Empleado    |   Cliente   |
| ------------------------------------------ | :---------: | :---------: | :---: | :-----------: | :---------: |
| Gestionar servicios                        |    CRUD     |    CRUD     | CRUD  |       —       |      —      |
| Gestionar empleados (asignación servicios) |    CRUD     |    CRUD     | CRUD  |       —       |      —      |
| Gestionar horarios generales               |    CRUD     |    CRUD     | CRUD  |       —       |      —      |
| Gestionar horarios de empleados            |    CRUD     |    CRUD     | CRUD  |  RU (propio)  |      —      |
| Gestionar días festivos/cierres            |    CRUD     |    CRUD     | CRUD  |       —       |      —      |
| Ver agenda general (todos los empleados)   |      R      |      R      |   R   |       —       |      —      |
| Ver agenda personal                        |      R      |      R      |   R   |       R       |      —      |
| Crear reserva (manual)                     |    CRUD     |    CRUD     | CRUD  |     CRUD      |      —      |
| Crear reserva (online)                     |      —      |      —      |   —   |       —       |    CRUD     |
| Ver detalle de cita                        |      R      |      R      |   R   | R (asignadas) | R (propias) |
| Cambiar estado de cita                     |      U      |      U      |   U   | U (asignadas) |      —      |
| Cancelar cita                              |      U      |      U      |   U   | U (asignadas) | U (propias) |
| Reprogramar cita                           |      U      |      U      |   U   | U (asignadas) | U (propias) |
| Ver historial de citas                     |      R      |      R      |   R   | R (asignadas) | R (propias) |
| Exportar historial a CSV                   |    CRUD     |    CRUD     | CRUD  |       —       |      —      |

### Módulo: Carta Digital

| Funcionalidad                 | Super Admin | Propietario | Admin | Empleado |   Cliente   |
| ----------------------------- | :---------: | :---------: | :---: | :------: | :---------: |
| Gestionar categorías          |    CRUD     |    CRUD     | CRUD  |    —     |      —      |
| Gestionar productos           |    CRUD     |    CRUD     | CRUD  |    —     |      —      |
| Gestionar variantes y extras  |    CRUD     |    CRUD     | CRUD  |    —     |      —      |
| Gestionar menús               |    CRUD     |    CRUD     | CRUD  |    —     |      —      |
| Marcar producto no disponible |      U      |      U      |   U   |    U     |      —      |
| Gestionar mesas y QRs         |    CRUD     |    CRUD     | CRUD  |    —     |      —      |
| Ver carta digital (gestión)   |      R      |      R      |   R   |    R     |      —      |
| Ver carta digital (pública)   |      —      |      —      |   —   |    —     |      R      |
| Ver panel de pedidos          |      R      |      R      |   R   |    R     |      —      |
| Actualizar estado de pedido   |      U      |      U      |   U   |    U     |      —      |
| Ver historial de pedidos      |      R      |      R      |   R   |    R     | R (propios) |
| Crear pedido (público)        |      —      |      —      |   —   |    —     |    CRUD     |
| Ver estado de pedido propio   |      —      |      —      |   —   |    —     |      R      |

### Módulo: CRM

| Funcionalidad                              | Super Admin | Propietario | Admin | Empleado |    Cliente    |
| ------------------------------------------ | :---------: | :---------: | :---: | :------: | :-----------: |
| Ver lista de clientes                      |      R      |      R      |   R   |    R     |       —       |
| Ver perfil de cliente                      |      R      |      R      |   R   |    R     |  R (propio)   |
| Crear/editar cliente                       |    CRUD     |    CRUD     | CRUD  |   CRUD   |  RU (propio)  |
| Agregar/editar notas de cliente            |    CRUD     |    CRUD     | CRUD  |   CRUD   |       —       |
| Gestionar etiquetas                        |    CRUD     |    CRUD     | CRUD  |    CU    |       —       |
| Asignar etiquetas a clientes               |    CRUD     |    CRUD     | CRUD  |    CU    |       —       |
| Configurar programa de fidelización        |    CRUD     |    CRUD     |   —   |    —     |       —       |
| Ver puntos del cliente                     |      R      |      R      |   R   |    R     |  R (propios)  |
| Canjear puntos                             |      U      |      U      |   U   |    U     | R (solicitar) |
| Ver estadísticas de clientes               |      R      |      R      |   R   |    —     |       —       |
| Ver historial de cliente (citas + pedidos) |      R      |      R      |   R   |    R     |  R (propio)   |
| Exportar clientes a CSV                    |    CRUD     |    CRUD     | CRUD  |    —     |       —       |

---

## Implementación de Permisos

### Capa 1: Frontend (UI)

**Ocultación de elementos**: Componentes, botones y secciones se muestran/ocultan según el rol del usuario.

```vue
<!-- shared/composables/usePermission.ts -->
export function usePermission() { const authStore = useAuthStore(); const can = { manageEmployees:
computed(() => ['owner', 'admin', 'super_admin'].includes(authStore.role)), manageServices:
computed(() => ['owner', 'admin', 'super_admin'].includes(authStore.role)), manageProducts:
computed(() => ['owner', 'admin', 'super_admin'].includes(authStore.role)), manageLoyalty:
computed(() => ['owner', 'super_admin'].includes(authStore.role)), viewAllBookings: computed(() =>
['owner', 'admin', 'super_admin'].includes(authStore.role)), updateBookingStatus: computed(() =>
['owner', 'admin', 'employee', 'super_admin'].includes(authStore.role)), cancelBooking: computed(()
=> ['owner', 'admin', 'employee', 'super_admin'].includes(authStore.role)), exportData: computed(()
=> ['owner', 'admin', 'super_admin'].includes(authStore.role)), }; return { can }; }
```

**Uso en templates**:

```vue
<template>
  <v-btn v-if="can.manageServices" @click="openServiceForm">
    {{ $t('services.add') }}
  </v-btn>
</template>
```

**Guards de ruta**:

```typescript
// app/router/guards.ts
export const requireRole = (roles: string[]) => {
  return (to, from, next) => {
    const authStore = useAuthStore();
    if (!roles.includes(authStore.role)) {
      return next({ path: '/dashboard' });
    }
    next();
  };
};

// Uso en rutas
{
  path: '/admin/employees',
  component: () => import('@modules/admin/views/TeamManagementView.vue'),
  meta: { roles: ['owner', 'admin'] },
  beforeEnter: [requireAuth, requireRole(['owner', 'admin'])],
}
```

### Capa 2: Base de Datos (RLS)

Las políticas RLS verifican el rol del usuario desde el JWT.

**Ejemplo: Política de UPDATE solo para owner/admin**:

```sql
CREATE POLICY "services_manage"
ON services
FOR ALL
TO authenticated
USING (
  tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
)
WITH CHECK (
  tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  AND (auth.jwt() ->> 'role') IN ('owner', 'admin', 'super_admin')
);
```

**Ejemplo: Empleado solo ve sus citas asignadas**:

```sql
CREATE POLICY "bookings_employee_select"
ON bookings
FOR SELECT
TO authenticated
USING (
  tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  AND (
    -- Si es empleado, solo ve citas donde está asignado
    ((auth.jwt() ->> 'role') = 'employee' AND employee_id IN (
      SELECT id FROM employees WHERE user_id = auth.uid()
    ))
    OR
    -- Si es admin/owner, ve todas las citas del tenant
    ((auth.jwt() ->> 'role') IN ('admin', 'owner', 'super_admin'))
  )
);
```

**Ejemplo: Cliente solo ve sus propios datos**:

```sql
CREATE POLICY "customers_client_select"
ON customers
FOR SELECT
TO authenticated
USING (
  id = (SELECT id FROM customers WHERE supabase_user_id = auth.uid())
  AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
);
```

### Capa 3: Edge Functions

Las Edge Functions verifican el rol antes de ejecutar operaciones sensibles.

```typescript
// supabase/edge-functions/invite-employee/index.ts
import { createSupabaseClient } from '../_shared/supabase-client.ts';

export async function handler(req: Request) {
  const supabase = createSupabaseClient(req);

  // Verificar autenticación
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Verificar rol
  const role = user.app_metadata?.role;
  if (!['owner', 'admin', 'super_admin'].includes(role)) {
    return new Response('Forbidden: insufficient permissions', { status: 403 });
  }

  // Ejecutar lógica...
}
```

---

## Jerarquía de Roles

Los roles tienen una jerarquía que determina el alcance de las operaciones:

```
super_admin  →  Acceso global a todos los tenantes
owner        →  Acceso total a su tenant
admin        →  Acceso operativo a su tenant
employee     →  Acceso limitado a sus asignaciones
customer     →  Acceso solo a sus propios datos
```

**Reglas de la jerarquía**:

1. Un rol puede realizar todas las operaciones de los roles inferiores.
2. Un rol no puede modificar datos de roles superiores.
3. Un admin no puede cambiar el rol del owner.
4. Un empleado no puede modificar datos de otros empleados (solo los suyos).
5. El super admin puede hacer cualquier cosa en cualquier tenant.

---

## Roles y Módulos

El acceso a un módulo está controlado por dos factores:

1. **Si el módulo está activo** para el tenant (configuración del negocio).
2. **El rol del usuario** dentro de ese módulo.

```
Ejemplo:
- Módulo CRM desactivado → nadie (ni owner) puede acceder a CRM.
- Módulo CRM activo → owner y admin tienen acceso completo; employee tiene acceso limitado.
```

**Implementación en frontend**:

```typescript
// shared/composables/usePermission.ts
export function useModuleAccess() {
  const tenantStore = useTenantStore();
  const authStore = useAuthStore();

  const canAccessModule = (moduleName: string) => {
    return tenantStore.modules[moduleName] === true;
  };

  return { canAccessModule };
}
```

---

## Consideraciones de Seguridad

| Aspecto                        | Implementación                                                                                                   |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| Suplantación de rol            | El rol se establece en el servidor (hook SQL) y viaja en el JWT firmado. No puede modificarse desde el frontend. |
| Principio de mínimo privilegio | Cada rol tiene exactamente los permisos que necesita. Ninguno tiene permisos adicionales.                        |
| Separación de datos            | El RLS asegura que incluso con el rol correcto, solo se accede a datos del tenant.                               |
| Auditoría de cambios           | Todos los cambios en roles y permisos se registran en audit_logs.                                                |
| Endpoints públicos             | No requieren autenticación ni rol. Solo operaciones de lectura o creación limitada.                              |

---

## Tabla de Roles en Base de Datos

No existe una tabla separada para roles. El rol se almacena directamente en la columna `role` de la tabla `users` como VARCHAR con CHECK constraint.

```sql
ALTER TABLE users
ADD CONSTRAINT chk_users_role
CHECK (role IN ('super_admin', 'owner', 'admin', 'employee'));

-- Los clientes NO están en la tabla users.
-- Los clientes están en la tabla customers.
```

Los clientes no tienen un rol en la tabla `users`. Su autorización se maneja mediante una combinación de:

1. **Autenticación**: Si el cliente creó una cuenta, tiene un JWT con `app_metadata.role = 'customer'`. Este rol no existe en el CHECK de users porque los clientes se autentican de forma separada.

2. **RLS para clientes**: Las policies RLS verifican que `supabase_user_id = auth.uid()` para acceder a sus datos.

3. **Guest (sin autenticación)**: Las policies RLS permiten INSERT en bookings y orders con validaciones específicas (sin acceso a SELECT de otros datos).

---

## Decisiones Tomadas

| Decisión                         | Opción                     | Alternativas                          | Justificación                                                                                                                  |
| -------------------------------- | -------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Almacenamiento de roles          | Columna `role` en `users`  | Tabla separada `roles` + `user_roles` | Simplicidad. Cada usuario tiene exactamente un rol. No necesitamos roles compuestos ni herencia.                               |
| Roles de cliente                 | No en tabla `users`        | Misma tabla con role='customer'       | Separación clara: personal del negocio ≠ clientes. Diferentes tablas, diferentes permisos, diferentes flujos de autenticación. |
| Permisos en frontend             | Composable `usePermission` | v-if con roles directamente           | Centraliza la lógica de permisos. Fácil de mantener y testear.                                                                 |
| Validación de permisos multicapa | UI + RLS + Edge Functions  | Solo RLS, solo UI                     | Defensa en profundidad. La UI oculta opciones, RLS previene acceso directo, EF protege operaciones complejas.                  |

---

## Posibles Mejoras Futuras

- **Roles personalizados**: Permitir que el propietario cree roles con permisos específicos (ej: "Cajero" que solo ve pedidos pero no clientes).
- **Permisos a nivel de recurso**: Control granular sobre qué empleados pueden gestionar qué servicios o productos.
- **Sesiones impersonadas**: Super admin puede "actuar como" un usuario de un tenant para depuración (con registro en auditoría).
- **Grupos de permisos**: Conjuntos reutilizables de permisos que se asignan a roles.
- **Temporal role elevation**: Elevar temporalmente permisos para una acción específica (ej: cubrir ausencia de admin).

---

_Documento generado el: 04/07/2026_
_Versión: 1.0_
_Próximo documento: 11-ui-design-system.md_
