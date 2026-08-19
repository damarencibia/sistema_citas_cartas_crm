export type EventStatus = 'confirmed' | 'waitlisted' | 'attended' | 'cancelled';

export type EventRegistrationStatus = EventStatus;

export interface EventRegCapacity {
  confirmed_count: number;
  waitlisted_count: number;
  total_participants: number;
  max_participants: number | null;
  spots_left: number | null;
}

export interface CreateEventRegistrationDTO {
  event_id: string;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  participant_count?: number;
  notes?: string | null;
  whatsapp_consent?: boolean;
}

export interface Event {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  category_id: string | null;
  max_participants: number | null;
  event_date: string;
  start_time: string;
  end_time: string;
  reservation_open_date: string | null;
  reservation_close_offset_minutes: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  category_name?: string;
}

export interface CreateEventDTO {
  name: string;
  description?: string | null;
  category_id?: string | null;
  max_participants?: number | null;
  event_date: string;
  start_time: string;
  end_time: string;
  reservation_open_date?: string | null;
  reservation_close_offset_minutes?: number | null;
  is_active?: boolean;
}

export type UpdateEventDTO = Partial<CreateEventDTO>;

export interface EventRegistration {
  id: string;
  tenant_id: string;
  event_id: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  participant_count: number;
  status: EventRegistrationStatus;
  access_token: string | null;
  notes: string | null;
  whatsapp_consent: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}