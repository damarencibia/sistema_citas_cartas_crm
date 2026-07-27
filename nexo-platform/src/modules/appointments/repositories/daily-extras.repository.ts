import { supabase } from '@/shared/api/supabase.client';
import type { DailyExtra, CreateDailyExtraDTO } from '../types/booking.types';

export const dailyExtrasRepository = {
  async getByEmployeeAndDate(employeeId: string, date: string): Promise<DailyExtra[]> {
    const { data, error } = await (supabase as any)
      .from('daily_extras')
      .select('*, service:services(name, duration_minutes, color)')
      .eq('employee_id', employeeId)
      .eq('date', date)
      .order('created_at');
    if (error) throw error;
    return (data ?? []) as DailyExtra[];
  },

  async create(tenantId: string, dto: CreateDailyExtraDTO): Promise<DailyExtra> {
    const { data, error } = await (supabase as any)
      .from('daily_extras')
      .insert({
        tenant_id: tenantId,
        employee_id: dto.employee_id,
        date: dto.date,
        customer_name: dto.customer_name,
        service_id: dto.service_id ?? null,
        notes: dto.notes ?? null,
      })
      .select('*, service:services(name, duration_minutes, color)')
      .single();
    if (error) throw error;
    return data as DailyExtra;
  },

  async remove(id: string): Promise<void> {
    const { error } = await (supabase as any).from('daily_extras').delete().eq('id', id);
    if (error) throw error;
  },
};
