import { defineStore } from 'pinia';
import { useAuthStore } from './auth.store';

/**
 * Separa los dos espacios de trabajo de la app:
 *  - 'admin': gestión del negocio (dashboard, agendas del equipo, servicios,
 *    CRM, configuración...). Solo roles owner/admin.
 *  - 'work': gestión individual del trabajador (Mi Agenda, Mis Servicios).
 *
 * Persistimos el último modo usado por usuario: quien atiende todo el día
 * abre la app directamente en su espacio de trabajo.
 */
export type WorkspaceMode = 'admin' | 'work';

interface WorkspaceState {
  mode: WorkspaceMode;
}

const STORAGE_KEY = (userId: string) => `nexo-workspace-mode:${userId}`;

export const useWorkspaceStore = defineStore('workspace', {
  state: (): WorkspaceState => ({
    mode: 'admin',
  }),

  getters: {
    /** El toggle solo existe para owner/admin; los empleados van fijos en 'work' */
    canSwitch(state): boolean {
      const role = useAuthStore().user?.role;
      return (role === 'owner' || role === 'admin') && !!state.mode;
    },
    isWorkMode: (state) => state.mode === 'work',
    isAdminMode: (state) => state.mode === 'admin',
  },

  actions: {
    /** Llamar tras cargar el perfil en el bootstrap: modo según rol + preferencia guardada */
    initMode() {
      const auth = useAuthStore();
      const role = auth.user?.role;
      if (role === 'employee') {
        this.mode = 'work';
        return;
      }
      const saved = auth.user ? localStorage.getItem(STORAGE_KEY(auth.user.id)) : null;
      this.mode = saved === 'work' ? 'work' : 'admin';
    },

    setMode(mode: WorkspaceMode): boolean {
      const role = useAuthStore().user?.role;
      if (role === 'employee' && mode !== 'work') return false;
      this.mode = mode;
      const userId = useAuthStore().user?.id;
      if (userId) localStorage.setItem(STORAGE_KEY(userId), mode);
      return true;
    },

    toggle(): boolean {
      return this.setMode(this.mode === 'work' ? 'admin' : 'work');
    },
  },
});
