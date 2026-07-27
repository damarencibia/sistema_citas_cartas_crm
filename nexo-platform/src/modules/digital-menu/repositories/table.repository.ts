import { supabase } from '@/shared/api/supabase.client';
import type { Table, CreateTableDTO, UpdateTableDTO } from '../types/table.types';

const TABLE = 'tables' as const;

export const tableRepository = {
  async getByTenant(tenantId: string): Promise<Table[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('number', { ascending: true });
    if (error) throw error;
    return (data ?? []) as Table[];
  },

  async create(payload: CreateTableDTO): Promise<Table> {
    const { data, error } = await supabase.from(TABLE).insert(payload as any).select().single();
    if (error) throw error;
    return data as Table;
  },

  async update(payload: UpdateTableDTO): Promise<Table> {
    const { id, ...rest } = payload;
    const { data, error } = await supabase.from(TABLE).update(rest as any).eq('id', id).select().single();
    if (error) throw error;
    return data as Table;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    if (error) throw error;
  },
};
