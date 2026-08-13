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
    toggleSidebar() {
      this.sidebar = !this.sidebar;
    },
    toggleSecondarySidebar() {
      this.secondarySidebarCollapsed = !this.secondarySidebarCollapsed;
    },
    toggleTheme() {
      this.theme = this.theme === 'light' ? 'dark' : 'light';
    },
    showNotification(message: string, color = 'info') {
      this.snackbar = { visible: true, message, color };
    },
  },
});
