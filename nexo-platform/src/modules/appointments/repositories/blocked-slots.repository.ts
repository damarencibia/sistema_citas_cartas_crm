import { supabase } from '@/shared/api/supabase.client';
import type { BlockedSlot } from '../types/booking.types';

export const blockedSlotsRepository = {
  async getByEmployeeAndDate(
    tenantId: string,
    employeeId: string,
    date: string,
  ): Promise<BlockedSlot[]> {
    const { data, error } = await (supabase as any)
      .from('blocked_slots')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('employee_id', employeeId)
      .eq('date', date)
      .order('start_time', { ascending: true });
    if (error) throw error;
    return (data ?? []) as BlockedSlot[];
  },

  async create(dto: {
    tenant_id: string;
    employee_id: string;
    date: string;
    start_time: string;
    end_time: string;
    reason?: string | null;
    created_by?: string | null;
  }): Promise<BlockedSlot> {
    const { data, error } = await (supabase as any)
      .from('blocked_slots')
      .insert({
        tenant_id: dto.tenant_id,
        employee_id: dto.employee_id,
        date: dto.date,
        start_time: dto.start_time,
        end_time: dto.end_time,
        reason: dto.reason ?? null,
        created_by: dto.created_by ?? null,
      })
      .select('*')
      .single();
    if (error) throw error;
    return data as BlockedSlot;
  },

  async remove(id: string): Promise<void> {
    const { error } = await (supabase as any)
      .from('blocked_slots')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};
