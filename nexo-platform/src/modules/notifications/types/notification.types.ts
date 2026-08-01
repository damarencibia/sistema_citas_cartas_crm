export type NotificationType = 'booking_created' | 'booking_pending_approval' | 'waitlist_offer';

export interface AppNotification {
  id: string;
  tenant_id: string;
  recipient_user_id: string | null;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  booking_created: 'Nueva reserva',
  booking_pending_approval: 'Pendiente de aprobación',
  waitlist_offer: 'Oferta de lista de espera',
};
