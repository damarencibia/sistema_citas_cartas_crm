import type { RouteLocationNormalized } from 'vue-router';

export async function authGuard(to: RouteLocationNormalized) {
  const { useAuthStore } = await import('@/shared/stores/auth.store');
  const authStore = useAuthStore();

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }

  if (to.meta.guest && authStore.isAuthenticated) {
    return { name: 'dashboard' };
  }
}

export async function roleGuard(to: RouteLocationNormalized) {
  if (!to.meta.role) return;

  const { useAuthStore } = await import('@/shared/stores/auth.store');
  const authStore = useAuthStore();

  const requiredRole = to.meta.role as string;
  const userRole = authStore.user?.role;

  if (!userRole) return { name: 'login' };

  const roleHierarchy: Record<string, number> = {
    super_admin: 4,
    owner: 3,
    admin: 2,
    employee: 1,
  };

  if ((roleHierarchy[userRole] ?? 0) < (roleHierarchy[requiredRole] ?? 0)) {
    return { name: 'dashboard' };
  }
}

/**
 * Separa los espacios de trabajo: si la vista exige un modo
 * (meta.workspace = 'admin' | 'work') y no coincide con el modo activo,
 * redirigimos al inicio de ese modo. Las rutas sin meta.workspace son
 * compartidas por ambos espacios (agenda, Mi Cuenta).
 */
export async function workspaceGuard(to: RouteLocationNormalized) {
  const required = to.meta.workspace as 'admin' | 'work' | undefined;
  if (!required) return;

  const { useWorkspaceStore } = await import('@/shared/stores/workspace.store');
  const workspaceStore = useWorkspaceStore();

  if (workspaceStore.mode === required) return;

  if (required === 'work') {
    return { path: '/appointments/agenda', query: { tab: 'reservas' } };
  }
  return { path: '/' };
}
