import { supabase } from '@/shared/api/supabase.client';
import type { AppNotification } from '../types/notification.types';

const NOTIFICATIONS_TTL_MS = 24 * 60 * 60 * 1000;

function ttlCutoff(): string {
  return new Date(Date.now() - NOTIFICATIONS_TTL_MS).toISOString();
}

export const notificationRepository = {
  async getMine(limit = 50): Promise<AppNotification[]> {
    const { data, error } = await (supabase as any)
      .from('notifications')
      .select('*')
      .gte('created_at', ttlCutoff())
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as AppNotification[];
  },

  async getUnreadCount(): Promise<number> {
    const { count, error } = await (supabase as any)
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('is_read', false)
      .gte('created_at', ttlCutoff());
    if (error) throw error;
    return count ?? 0;
  },

  async markAsRead(id: string): Promise<void> {
    const { error } = await (supabase as any)
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },

  async markAllAsRead(): Promise<void> {
    const { error } = await (supabase as any)
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('is_read', false);
    if (error) throw error;
  },

  async remove(id: string): Promise<void> {
    const { error } = await (supabase as any).from('notifications').delete().eq('id', id);
    if (error) throw error;
  },

  async clearAll(): Promise<void> {
    const { error } = await (supabase as any)
      .from('notifications')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) throw error;
  },
};
