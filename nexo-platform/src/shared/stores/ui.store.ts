import { defineStore } from 'pinia';

interface Snackbar {
  visible: boolean;
  message: string;
  color: string;
}

interface UiStoreState {
  sidebar: boolean;
  theme: 'light' | 'dark';
  globalLoading: boolean;
  snackbar: Snackbar;
}

export const useUiStore = defineStore('ui', {
  state: (): UiStoreState => ({
    sidebar: false,
    theme: 'light',
    globalLoading: false,
    snackbar: { visible: false, message: '', color: 'info' },
  }),

  actions: {
    toggleSidebar() {
      this.sidebar = !this.sidebar;
    },
    toggleTheme() {
      this.theme = this.theme === 'light' ? 'dark' : 'light';
    },
    showNotification(message: string, color = 'info') {
      this.snackbar = { visible: true, message, color };
    },
  },
});
