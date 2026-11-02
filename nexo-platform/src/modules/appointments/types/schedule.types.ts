import type { BaseEntity } from '@/shared/types';

export const DEFAULT_SCHEDULE_ID = '__business_default__';

export interface Schedule extends BaseEntity {
  tenant_id: string;
  employee_id: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
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
}

/**
 * Rango horario de un turno. La retícula de slots se genera por
 * la duración del servicio, no del turno: el turno solo define
 * inicio y fin.
 */
export interface ScheduleShiftInput {
  start_time: string;
  end_time: string;
}

/**
 * Marco global del negocio para un día de la semana (apertura/cierre).
 * Se deriva de las filas `schedules` con employee_id NULL:
 * min(open) / max(close) de ese día.
 */
export interface BusinessDayFrame {
  start_time: string;
  end_time: string;
}

export interface CreateHolidayDTO {
  date: string;
  is_closed?: boolean;
  start_time?: string;
  end_time?: string;
  reason?: string;
}
