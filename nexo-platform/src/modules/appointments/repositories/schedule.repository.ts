import { supabase } from '@/shared/api/supabase.client';
import type { Schedule, HolidayException, CreateScheduleDTO, CreateHolidayDTO, FixedSlotDefinition, CreateFixedSlotDTO } from '../types/schedule.types';

export const scheduleRepository = {
  async getByEmployee(employeeId: string | null): Promise<Schedule[]> {
    let query = (supabase as any).from('schedules').select('*').order('day_of_week');
    query = employeeId ? query.eq('employee_id', employeeId) : query.is('employee_id', null);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as Schedule[];
  },

  async replaceAll(tenantId: string, employeeId: string | null, schedules: CreateScheduleDTO[]): Promise<void> {
    const { error: delErr } = await (supabase as any)
      .from('schedules')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('employee_id', employeeId ?? '');
    if (delErr) throw delErr;

    if (!schedules.length) return;

    const rows = schedules.map((s) => ({
      tenant_id: tenantId,
      employee_id: employeeId ?? null,
      day_of_week: s.day_of_week,
      start_time: s.start_time,
      end_time: s.end_time,
      is_active: true,
      slot_mode: s.slot_mode ?? 'fixed',
      slot_interval_minutes: s.slot_interval_minutes ?? 30,
      buffer_before_minutes: s.buffer_before_minutes ?? 0,
      buffer_after_minutes: s.buffer_after_minutes ?? 0,
      advance_booking_days: s.advance_booking_days ?? 7,
      min_advance_minutes: s.min_advance_minutes ?? 15,
    }));
    const { error: insErr } = await (supabase as any).from('schedules').insert(rows);
    if (insErr) throw insErr;
  },

  async deleteSchedule(scheduleId: string): Promise<void> {
    const { error } = await (supabase as any).from('schedules').delete().eq('id', scheduleId);
    if (error) throw error;
  },

  // --- Fixed Slot Definitions ---

  async getFixedSlots(tenantId: string, employeeId: string): Promise<FixedSlotDefinition[]> {
    const { data, error } = await (supabase as any)
      .from('fixed_slot_definitions')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('employee_id', employeeId)
      .order('day_of_week')
      .order('start_time');
    if (error) throw error;
    return (data ?? []) as FixedSlotDefinition[];
  },

  async createFixedSlot(tenantId: string, dto: CreateFixedSlotDTO): Promise<FixedSlotDefinition> {
    const { data, error } = await (supabase as any)
      .from('fixed_slot_definitions')
      .insert({
        tenant_id: tenantId,
        employee_id: dto.employee_id ?? null,
        day_of_week: dto.day_of_week,
        start_time: dto.start_time,
        end_time: dto.end_time,
        is_active: true,
      })
      .select()
      .single();
    if (error) throw error;
    return data as FixedSlotDefinition;
  },

  async deleteFixedSlot(id: string): Promise<void> {
    const { error } = await (supabase as any).from('fixed_slot_definitions').delete().eq('id', id);
    if (error) throw error;
  },

  // --- Holidays ---

  async getHolidays(tenantId: string): Promise<HolidayException[]> {
    const { data, error } = await (supabase as any)
      .from('holiday_exceptions')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('date');
    if (error) throw error;
    return (data ?? []) as HolidayException[];
  },

  async createHoliday(tenantId: string, dto: CreateHolidayDTO): Promise<HolidayException> {
    const { data, error } = await (supabase as any)
      .from('holiday_exceptions')
      .insert({
        tenant_id: tenantId,
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
