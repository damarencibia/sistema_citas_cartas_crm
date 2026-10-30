import { supabase } from '@/shared/api/supabase.client';
import type { Schedule, HolidayException, CreateScheduleDTO, CreateHolidayDTO } from '../types/schedule.types';

export const scheduleRepository = {
  async getByEmployee(employeeId: string | null): Promise<Schedule[]> {
    let query = (supabase as any).from('schedules').select('*').order('day_of_week');
    query = employeeId ? query.eq('employee_id', employeeId) : query.is('employee_id', null);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as Schedule[];
  },

  async replaceAll(employeeId: string | null, schedules: CreateScheduleDTO[]): Promise<void> {
    const { error } = await (supabase as any).rpc('replace_schedules', {
      p_employee_id: employeeId,
      p_schedules: schedules.map((s) => ({
        day_of_week: s.day_of_week,
        start_time: s.start_time,
        end_time: s.end_time,
        slot_mode: s.slot_mode ?? 'fixed',
        slot_interval_minutes: s.slot_interval_minutes ?? 30,
        advance_booking_days: s.advance_booking_days ?? 7,
        min_advance_minutes: s.min_advance_minutes ?? 15,
      })),
    });
    if (error) throw error;
  },

  async deleteSchedule(scheduleId: string): Promise<void> {
    const { error } = await (supabase as any).from('schedules').delete().eq('id', scheduleId);
    if (error) throw error;
  },

  // --- Holidays ---

  async getHolidays(tenantId: string, employeeId: string | null): Promise<HolidayException[]> {
    let query = (supabase as any).from('holiday_exceptions').select('*').eq('tenant_id', tenantId);
    if (employeeId) {
      query = query.or(`employee_id.is.null,employee_id.eq.${employeeId}`);
    } else {
      query = query.is('employee_id', null);
    }
    const { data, error } = await query.order('date');
    if (error) throw error;
    return (data ?? []) as HolidayException[];
  },

  async createHoliday(tenantId: string, employeeId: string | null, dto: CreateHolidayDTO): Promise<HolidayException> {
    const { data, error } = await (supabase as any)
      .from('holiday_exceptions')
      .insert({
        tenant_id: tenantId,
        employee_id: employeeId,
        date: dto.date,
        is_closed: dto.is_closed ?? true,
        start_time: dto.is_closed ? null : (dto.start_time ?? null),
        end_time: dto.is_closed ? null : (dto.end_time ?? null),
        reason: dto.reason ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return data as HolidayException;
  },

  async deleteHoliday(id: string): Promise<void> {
    const { error } = await (supabase as any).from('holiday_exceptions').delete().eq('id', id);
    if (error) throw error;
  },
};
