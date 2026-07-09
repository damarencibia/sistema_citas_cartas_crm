import { useAuthStore } from '@/shared/stores/auth.store';
import type { User } from '@/shared/types';

export function usePermission() {
  const authStore = useAuthStore();

  const roleHierarchy: Record<string, number> = {
    super_admin: 4,
    owner: 3,
    admin: 2,
    employee: 1,
  };

  function hasRole(minimumRole: User['role']): boolean {
    if (!authStore.user?.role) return false;
    return (roleHierarchy[authStore.user.role] ?? 0) >= (roleHierarchy[minimumRole] ?? 0);
  }

  function isOwner(): boolean {
    return authStore.user?.role === 'owner' || authStore.user?.role === 'super_admin';
  }

  function isSuperAdmin(): boolean {
    return authStore.user?.role === 'super_admin';
  }

  function canManageModule(): boolean {
    if (isSuperAdmin()) return true;
    return hasRole('admin');
  }

  return { hasRole, isOwner, isSuperAdmin, canManageModule };
}
