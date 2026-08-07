import type { BaseEntity } from '@/shared/types';

export type BookingStatus =
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'no_show'
  | 'cancelled'
  | 'pending_approval'
  | 'pending_confirmation';
export type BookingSource = 'online' | 'manual' | 'phone' | 'walk_in';
export type CancelledBy = 'customer' | 'employee' | 'system';
export type StatusChangedBy = 'employee' | 'system' | 'customer';

export interface Booking extends BaseEntity {
  tenant_id: string;
  customer_id: string | null;
  service_id: string;
  employee_id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  cancellation_reason: string | null;
  cancelled_by: CancelledBy | null;
  cancelled_at: string | null;
  no_show_at: string | null;
  late_minutes: number | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  notes: string | null;
  source: BookingSource;
  resource_id: string | null;
  custom_duration_minutes: number | null;
  requires_approval: boolean;
  participant_count: number;
  whatsapp_consent: boolean;
  service?: { name: string; duration_minutes: number; color: string };
  employee?: { first_name: string; last_name: string; color: string };
}

export interface CreateBookingDTO {
  service_id: string;
  employee_id: string;
  date: string;
  start_time: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  notes?: string;
  source?: BookingSource;
  custom_duration_minutes?: number;
  participant_count?: number;
  resource_id?: string;
  whatsapp_consent?: boolean;
}

export interface CreateBookingResult {
  booking: Booking;
  accessToken: string | null;
}

export interface CustomerBookingSummary {
  booking_id: string;
  tenant_id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  service_name: string;
  employee_name: string;
  cancelled_at: string | null;
}

export interface UpdateBookingDTO {
  service_id?: string;
  employee_id?: string;
  date?: string;
  start_time?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  notes?: string;
  custom_duration_minutes?: number;
  participant_count?: number;
  resource_id?: string;
  whatsapp_consent?: boolean;
}

export interface BookingFilters {
  date?: string;
  date_from?: string;
  date_to?: string;
  employee_id?: string | null;
  status?: BookingStatus | null;
}

export interface AvailableSlot {
  start_time: string;
  end_time: string;
  slot_type: 'auto' | 'predefined' | 'window';
  capacity_remaining: number;
  status?: 'available' | 'occupied' | 'past';
  waitlist_count?: number;
}

export interface BookingWindow {
  id: string;
  tenant_id: string;
  employee_id: string | null;
  service_id: string | null;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  slot_mode: 'fixed' | 'flexible';
  slot_interval_minutes: number;
  is_active: boolean;
  created_at: string;
}

export interface CreateBookingWindowDTO {
  employee_id?: string;
  service_id?: string;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  slot_mode?: 'fixed' | 'flexible';
  slot_interval_minutes?: number;
}

export interface BookingStatusLog {
  id: string;
  booking_id: string;
  tenant_id: string;
  old_status: BookingStatus | null;
  new_status: BookingStatus;
  changed_by: StatusChangedBy;
  changed_by_name: string | null;
  reason: string | null;
  created_at: string;
}

export interface ClientBlock {
  id: string;
  tenant_id: string;
  customer_email: string;
  blocked_until: string;
  reason: string | null;
  no_show_count: number;
  created_at: string;
}

export interface ClientBlockCheck {
  is_blocked: boolean;
  blocked_until: string | null;
  no_show_count: number;
}

export interface ReassignBookingDTO {
  booking_id: string;
  new_date: string;
  new_start_time: string;
}

export type WaitlistPreference = 'exact' | 'flexible';

export interface WaitlistEntry {
  id: string;
  tenant_id: string;
  service_id: string;
  employee_id: string | null;
  preferred_date: string;
  preferred_times: string[];
  preferred_time_start: string | null;
  preferred_time_end: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  position: number;
  status: 'waiting' | 'notified' | 'converted' | 'expired' | 'cancelled';
  notified_at: string | null;
  entry_expires_at: string;
  created_at: string;
  preference: WaitlistPreference;
  offered_slot_date: string | null;
  offered_slot_time: string | null;
  offer_expires_at: string | null;
  offer_token: string | null;
  service?: { name: string; duration_minutes: number; color: string };
  employee?: { first_name: string; last_name: string; color: string };
}

export interface CreateWaitlistDTO {
  service_id: string;
  employee_id?: string;
  preferred_date: string;
  preferred_times?: string[];
  preferred_time_start?: string;
  preferred_time_end?: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  preference?: WaitlistPreference;
}

export interface RecurringPattern {
  id: string;
  tenant_id: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  service_id: string;
  employee_id: string;
  frequency: 'weekly' | 'biweekly' | 'monthly';
  day_of_week: number | null;
  day_of_month: number | null;
  preferred_time: string;
  start_date: string;
  end_date: string;
  total_occurrences: number | null;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  notes: string | null;
  created_at: string;
  service?: { name: string; duration_minutes: number; color: string };
  employee?: { first_name: string; last_name: string; color: string };
}

export interface CreateRecurringDTO {
  service_id: string;
  employee_id: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  frequency: RecurringPattern['frequency'];
  day_of_week?: number;
  day_of_month?: number;
  preferred_time: string;
  start_date: string;
  end_date: string;
  total_occurrences?: number;
  notes?: string;
}

export interface RecurringInstance {
  id: string;
  pattern_id: string;
  booking_id: string | null;
  scheduled_date: string;
  status: 'scheduled' | 'booked' | 'skipped' | 'cancelled';
  created_at: string;
}

export interface RecurrenceData {
  enabled: boolean;
  frequency: 'weekly' | 'biweekly' | 'monthly';
  day_of_week: number | null;
  day_of_month: number | null;
  preferred_time: string;
  start_date: string;
  end_date: string;
}

export interface DailyExtra {
  id: string;
  tenant_id: string;
  employee_id: string;
  date: string;
  customer_name: string;
  service_id: string | null;
  notes: string | null;
  created_at: string;
  service?: { name: string; duration_minutes: number; color: string };
}

export interface CreateDailyExtraDTO {
  employee_id: string;
  date: string;
  customer_name: string;
  service_id?: string;
  notes?: string;
}

export interface DailyClosure {
  id: string;
  tenant_id: string;
  employee_id: string;
  date: string;
  closed_by: string | null;
  total_bookings: number;
  attended: number;
  no_shows: number;
  extras: number;
  total_attended: number;
  closed_at: string;
  reopened_at: string | null;
}

export interface CloseDayDTO {
  employee_id: string;
  date: string;
  closed_by: string | null;
  total_bookings: number;
  attended: number;
  no_shows: number;
  extras: number;
  total_attended: number;
}
