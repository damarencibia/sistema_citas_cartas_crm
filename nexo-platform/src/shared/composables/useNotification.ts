import { useUiStore } from '@/shared/stores/ui.store';

export function useNotification() {
  const uiStore = useUiStore();

  function success(message: string) {
    uiStore.showNotification(message, 'success');
  }

  function error(message: string) {
    uiStore.showNotification(message, 'error');
  }

  function info(message: string) {
    uiStore.showNotification(message, 'info');
  }

  function warning(message: string) {
    uiStore.showNotification(message, 'warning');
  }

  return { success, error, info, warning };
}
