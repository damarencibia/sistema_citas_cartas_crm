import { supabase } from '@/shared/api/supabase.client';
import type { AppNotification } from '../types/notification.types';

export const notificationRepository = {
  async getMine(limit = 50): Promise<AppNotification[]> {
    const { data, error } = await (supabase as any)
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as AppNotification[];
  },

  async getUnreadCount(): Promise<number> {
    const { count, error } = await (supabase as any)
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('is_read', false);
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
};
