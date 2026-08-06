import { defineStore } from 'pinia';
import { supabase } from '@/shared/api/supabase.client';
import { notificationRepository } from '../repositories/notification.repository';
import type { AppNotification } from '../types/notification.types';

type RealtimeChannel = ReturnType<typeof supabase.channel>;

export const useNotificationStore = defineStore('notifications', {
  state: () => ({
    items: [] as AppNotification[],
    unreadCount: 0,
    loading: false,
    channel: null as RealtimeChannel | null,
  }),

  getters: {
    hasUnread: (state) => state.unreadCount > 0,
  },

  actions: {
    async fetch() {
      this.loading = true;
      try {
        const [items, unread] = await Promise.all([
          notificationRepository.getMine(30),
          notificationRepository.getUnreadCount(),
        ]);
        this.items = items;
        this.unreadCount = unread;
      } finally {
        this.loading = false;
      }
    },

    async refreshUnread() {
      this.unreadCount = await notificationRepository.getUnreadCount();
    },

    async markAsRead(id: string) {
      await notificationRepository.markAsRead(id);
      const item = this.items.find((n) => n.id === id);
      if (item && !item.is_read) {
        item.is_read = true;
        item.read_at = new Date().toISOString();
        this.unreadCount = Math.max(0, this.unreadCount - 1);
      }
    },

    async markAllAsRead() {
      await notificationRepository.markAllAsRead();
      this.items.forEach((n) => {
        n.is_read = true;
        n.read_at = new Date().toISOString();
      });
      this.unreadCount = 0;
    },

    async remove(id: string) {
      const item = this.items.find((n) => n.id === id);
      this.items = this.items.filter((n) => n.id !== id);
      if (item && !item.is_read) {
        this.unreadCount = Math.max(0, this.unreadCount - 1);
      }
      try {
        await notificationRepository.remove(id);
      } catch {
        await this.fetch();
      }
    },

    async clearAll() {
      const previousItems = this.items;
      const previousUnread = this.unreadCount;
      this.items = [];
      this.unreadCount = 0;
      try {
        await notificationRepository.clearAll();
      } catch {
        this.items = previousItems;
        this.unreadCount = previousUnread;
      }
    },

    subscribe() {
      if (this.channel) return;
      this.channel = supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications' },
          async (payload) => {
            const incoming = payload.new as AppNotification;
            const existing = this.items.find((n) => n.id === incoming.id);
            if (!existing) {
              this.items.unshift(incoming);
              this.items = this.items.slice(0, 50);
              this.unreadCount += 1;
            }
          },
        )
        .on(
          'postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'notifications' },
          (payload) => {
            const id = (payload.old as AppNotification).id;
            const item = this.items.find((n) => n.id === id);
            if (!item) return;
            this.items = this.items.filter((n) => n.id !== id);
            if (!item.is_read) {
              this.unreadCount = Math.max(0, this.unreadCount - 1);
            }
          },
        )
        .subscribe();
    },

    unsubscribe() {
      if (this.channel) {
        supabase.removeChannel(
          this.channel as unknown as Parameters<typeof supabase.removeChannel>[0],
        );
        this.channel = null;
      }
    },
  },
});
