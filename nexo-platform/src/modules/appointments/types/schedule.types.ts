import type { BaseEntity } from '@/shared/types';

export const DEFAULT_SCHEDULE_ID = '__business_default__';

export interface Schedule extends BaseEntity {
  tenant_id: string;
  employee_id: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  slot_mode: 'fixed' | 'flexible';
  slot_interval_minutes: number;
  advance_booking_days: number;
  min_advance_minutes: number;
}

export interface HolidayException {
  id: string;
  tenant_id: string;
  employee_id: string | null;
  date: string;
  is_closed: boolean;
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
  created_at: string;
}

export interface CreateScheduleDTO {
  id?: string;
  employee_id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_mode?: 'fixed' | 'flexible';
  slot_interval_minutes?: number;
  advance_booking_days?: number;
  min_advance_minutes?: number;
}

export interface ScheduleShiftInput {
  start_time: string;
  end_time: string;
  slot_mode: 'fixed' | 'flexible';
  slot_interval_minutes: number;
  advance_booking_days: number;
  min_advance_minutes: number;
}

export interface CreateHolidayDTO {
  date: string;
  is_closed?: boolean;
  start_time?: string;
  end_time?: string;
  reason?: string;
}
