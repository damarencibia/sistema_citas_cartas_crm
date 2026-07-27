import { supabase } from '@/shared/api/supabase.client';
import type { Category, CreateCategoryDTO, UpdateCategoryDTO } from '../types/category.types';

const TABLE = 'categories' as const;

export const categoryRepository = {
  async getByTenant(tenantId: string): Promise<Category[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('tenant_id', tenantId)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return (data ?? []) as Category[];
  },

  async create(payload: CreateCategoryDTO): Promise<Category> {
    const { data, error } = await supabase.from(TABLE).insert(payload as any).select().single();
    if (error) throw error;
    return data as Category;
  },

  async update(payload: UpdateCategoryDTO): Promise<Category> {
    const { id, ...rest } = payload;
    const { data, error } = await supabase.from(TABLE).update(rest as any).eq('id', id).select().single();
    if (error) throw error;
    return data as Category;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    if (error) throw error;
  },
};
