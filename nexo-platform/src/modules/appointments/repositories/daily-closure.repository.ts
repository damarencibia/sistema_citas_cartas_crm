import { supabase } from '@/shared/api/supabase.client';
import type { DailyClosure, CloseDayDTO } from '../types/booking.types';

export const dailyClosureRepository = {
  async getByEmployeeAndDate(employeeId: string, date: string): Promise<DailyClosure | null> {
    const { data, error } = await (supabase as any)
      .from('daily_closures')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('date', date)
      .is('reopened_at', null)
      .maybeSingle();
    if (error) throw error;
    return (data as DailyClosure) ?? null;
  },

  async close(tenantId: string, dto: CloseDayDTO): Promise<DailyClosure> {
    const { data, error } = await (supabase as any)
      .from('daily_closures')
      .upsert(
        {
          tenant_id: tenantId,
          employee_id: dto.employee_id,
          date: dto.date,
          closed_by: dto.closed_by ?? null,
          total_bookings: dto.total_bookings,
          attended: dto.attended,
          no_shows: dto.no_shows,
          extras: dto.extras,
          total_attended: dto.total_attended,
          reopened_at: null,
        },
        { onConflict: 'tenant_id,employee_id,date' },
      )
      .select('*')
      .single();
    if (error) throw error;
    return data as DailyClosure;
  },

  async reopen(employeeId: string, date: string): Promise<void> {
    const { error } = await (supabase as any)
      .from('daily_closures')
      .update({ reopened_at: new Date().toISOString() })
      .eq('employee_id', employeeId)
      .eq('date', date)
      .is('reopened_at', null);
    if (error) throw error;
  },
};
