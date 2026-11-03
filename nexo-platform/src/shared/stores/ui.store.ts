import { defineStore } from 'pinia';

interface Snackbar {
  visible: boolean;
  message: string;
  color: string;
}

interface UiStoreState {
  sidebar: boolean;
  secondarySidebarCollapsed: boolean;
  theme: 'light' | 'dark';
  globalLoading: boolean;
  snackbar: Snackbar;
  notificationsOpen: boolean;
}

const THEME_STORAGE_KEY = 'nexo-theme';

function detectInitialTheme(): 'light' | 'dark' {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
  } catch {
    // localStorage puede estar bloqueado (modo privado) — caemos a la preferencia del sistema
  }
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

function persistTheme(theme: 'light' | 'dark') {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // silencioso: no persistir el tema no es un error de usuario
  }
}

export const useUiStore = defineStore('ui', {
  state: (): UiStoreState => ({
    sidebar: false,
    secondarySidebarCollapsed: false,
    theme: 'light',
    globalLoading: false,
    snackbar: { visible: false, message: '', color: 'info' },
    notificationsOpen: false,
  }),

  actions: {
    initTheme() {
      this.theme = detectInitialTheme();
      persistTheme(this.theme);
    },
    toggleSidebar() {
      this.sidebar = !this.sidebar;
    },
    toggleSecondarySidebar() {
      this.secondarySidebarCollapsed = !this.secondarySidebarCollapsed;
    },
    toggleTheme() {
      this.theme = this.theme === 'light' ? 'dark' : 'light';
      persistTheme(this.theme);
    },
    showNotification(message: string, color = 'info') {
      this.snackbar = { visible: false, message, color };
      // Re-emisión en el próximo tick: permite que dos toasts idénticos consecutivos
      // reinicien timer y animación en lugar de ser ignorados por v-model.
      requestAnimationFrame(() => {
        this.snackbar = { visible: true, message, color };
      });
    },
  },
});
