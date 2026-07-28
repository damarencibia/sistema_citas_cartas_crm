import { supabase } from '@/shared/api/supabase.client';
import type { ServiceCategory, CreateServiceCategoryDTO, UpdateServiceCategoryDTO } from '../types/service-category.types';
import type { Employee } from '../types/employee.types';

const TABLE = 'service_categories' as const;

export const serviceCategoryRepository = {
  async getAll(tenantId: string): Promise<ServiceCategory[]> {
    const { data, error } = await (supabase as any)
      .from(TABLE)
      .select('*')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('sort_order');
    if (error) throw error;
    return (data ?? []) as ServiceCategory[];
  },

  async getById(id: string): Promise<ServiceCategory | null> {
    const { data, error } = await (supabase as any).from(TABLE).select('*').eq('id', id).single();
    if (error) throw error;
    return data as ServiceCategory | null;
  },

  async create(dto: CreateServiceCategoryDTO, tenantId: string): Promise<ServiceCategory> {
    const { data, error } = await (supabase as any)
      .from(TABLE)
      .insert({
        tenant_id: tenantId,
        name: dto.name,
        description: dto.description ?? null,
        icon: dto.icon ?? 'mdi-tag-outline',
      })
      .select()
      .single();
    if (error) throw error;
    return data as ServiceCategory;
  },

  async update(id: string, dto: UpdateServiceCategoryDTO): Promise<ServiceCategory> {
    const { data, error } = await (supabase as any)
      .from(TABLE)
      .update({ ...dto, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as ServiceCategory;
  },

  async softDelete(id: string): Promise<void> {
    const { error } = await (supabase as any)
      .from(TABLE)
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },

  async getEmployeesByCategory(categoryId: string): Promise<Employee[]> {
    const { data, error } = await (supabase as any)
      .from('services')
      .select('employee:employee_id(*)')
      .eq('category_id', categoryId)
      .is('deleted_at', null)
      .not('employee_id', 'is', null);
    if (error) throw error;
    const employees = (data ?? [])
      .map((row: any) => row.employee)
      .filter((e: any) => e && !e.deleted_at);
    const unique = new Map<string, Employee>();
    for (const e of employees) {
      if (!unique.has(e.id)) unique.set(e.id, e as Employee);
    }
    return Array.from(unique.values());
  },
};
