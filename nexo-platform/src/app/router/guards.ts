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
