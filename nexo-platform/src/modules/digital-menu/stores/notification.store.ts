import { defineStore } from 'pinia';
import { ref } from 'vue';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  duration?: number;
  dismissible?: boolean;
  sound?: 'new_order' | 'order_ready' | 'order_cancelled';
}

export const useNotificationStore = defineStore('digital-menu/notifications', () => {
  const notifications = ref<Notification[]>([]);
  let nextId = 0;

  function addNotification(
    title: string,
    message: string,
    type: NotificationType = 'info',
    duration = 5000,
    sound?: Notification['sound']
  ) {
    const id = `notif-${nextId++}`;
    const notification: Notification = {
      id,
      title,
      message,
      type,
      duration,
      dismissible: true,
      sound,
    };

    notifications.value.push(notification);

    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }

    return id;
  }

  function removeNotification(id: string) {
    const index = notifications.value.findIndex((n) => n.id === id);
    if (index !== -1) {
      notifications.value.splice(index, 1);
    }
  }

  function clearAll() {
    notifications.value = [];
  }

  return {
    notifications,
    addNotification,
    removeNotification,
    clearAll,
  };
});
