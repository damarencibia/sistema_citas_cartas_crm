import { defineStore } from 'pinia';
import {
  isPushSupported,
  isVapidConfigured,
  getPushSubscription,
  requestPushSubscription,
  savePushSubscription,
  removePushSubscription,
  hasStoredPushSubscriptions,
} from '@/shared/utils/push';

interface PushStoreState {
  supported: boolean;
  configured: boolean;
  permission: NotificationPermission | 'unsupported';
  subscribed: boolean;
  checking: boolean;
  enabling: boolean;
  dismissed: boolean;
  error: string | null;
}

const DISMISS_KEY = 'nexo:push-dismissed';

export const usePushStore = defineStore('push', {
  state: (): PushStoreState => ({
    supported: false,
    configured: false,
    permission: 'unsupported',
    subscribed: false,
    checking: false,
    enabling: false,
    dismissed: false,
    error: null,
  }),

  getters: {
    canPrompt: (state) =>
      state.supported &&
      state.configured &&
      !state.subscribed &&
      state.permission !== 'denied' &&
      !state.dismissed,
    isEnabled: (state) => state.subscribed,
  },

  actions: {
    async init() {
      this.supported = isPushSupported();
      this.configured = isVapidConfigured();
      if (!this.supported || !this.configured) return;

      this.permission =
        typeof Notification !== 'undefined' ? Notification.permission : 'unsupported';
      this.dismissed = localStorage.getItem(DISMISS_KEY) === '1';
      this.checking = true;
      try {
        const subscription = await getPushSubscription();
        if (subscription) {
          const stored = await hasStoredPushSubscriptions();
          if (!stored) await savePushSubscription(subscription);
          this.subscribed = true;
        } else {
          this.subscribed = false;
        }
      } catch (err) {
        console.error('push.init:', err);
        this.subscribed = false;
      } finally {
        this.checking = false;
      }
    },

    async enable() {
      if (!this.supported || !this.configured || this.enabling) return;
      this.error = null;
      this.enabling = true;
      try {
        const subscription = await requestPushSubscription();
        await savePushSubscription(subscription);
        this.subscribed = true;
        this.permission =
          typeof Notification !== 'undefined' ? Notification.permission : 'unsupported';
      } catch (err) {
        console.error('push.enable:', err);
        if (import.meta.env.DEV) {
          this.error = 'Las notificaciones push se activan solo en el despliegue (no en local).';
        } else if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
          this.error = 'Permiso de notificaciones denegado en el navegador.';
        } else {
          this.error = 'No se pudieron activar las notificaciones. Inténtalo de nuevo.';
        }
      } finally {
        this.enabling = false;
      }
    },

    async disable() {
      try {
        const subscription = await getPushSubscription();
        if (subscription) {
          await removePushSubscription(subscription.endpoint);
          await subscription.unsubscribe();
        }
        this.subscribed = false;
      } catch (err) {
        console.error('push.disable:', err);
      }
    },

    dismiss() {
      this.dismissed = true;
      localStorage.setItem(DISMISS_KEY, '1');
    },
  },
});
