import { supabase } from '@/shared/api/supabase.client';
import type { Service, CreateServiceDTO, UpdateServiceDTO } from '../types/service.types';

const TABLE = 'services' as const;

export const serviceRepository = {
  async getAll(): Promise<Service[]> {
    const { data, error } = await (supabase as any)
      .from(TABLE)
      .select(`
        *,
        category:category_id(name),
        employee:employee_id(first_name, last_name)
      `)
      .is('deleted_at', null)
      .order('sort_order');
    if (error) throw error;
    return (data ?? []).map(mapService);
  },

  async getById(id: string): Promise<Service | null> {
    const { data, error } = await (supabase as any)
      .from(TABLE)
      .select(`
        *,
        category:category_id(name),
        employee:employee_id(first_name, last_name)
      `)
      .eq('id', id)
      .single();
    if (error) throw error;
    return data ? mapService(data) : null;
  },

  async getByEmployee(employeeId: string): Promise<Service[]> {
    const { data, error } = await (supabase as any)
      .from(TABLE)
      .select(`
        *,
        category:category_id(name),
        employee:employee_id(first_name, last_name)
      `)
      .eq('employee_id', employeeId)
      .is('deleted_at', null)
      .order('sort_order');
    if (error) throw error;
    return (data ?? []).map(mapService);
  },

  async getByCategory(categoryId: string): Promise<Service[]> {
    const { data, error } = await (supabase as any)
      .from(TABLE)
      .select(`
        *,
        category:category_id(name),
        employee:employee_id(first_name, last_name)
      `)
      .eq('category_id', categoryId)
      .is('deleted_at', null)
      .order('sort_order');
    if (error) throw error;
    return (data ?? []).map(mapService);
  },

  async create(dto: CreateServiceDTO, tenantId: string): Promise<Service> {
    const { data, error } = await (supabase as any)
      .from(TABLE)
      .insert({
        tenant_id: tenantId,
        name: dto.name,
        description: dto.description ?? null,
        duration_minutes: dto.duration_minutes,
        price: dto.price,
        color: dto.color ?? '#1976D2',
        category_id: dto.category_id,
        employee_id: dto.employee_id ?? null,
        image_url: dto.image_url ?? null,
        max_participants: dto.max_participants ?? 1,
        requires_approval: dto.requires_approval ?? false,
      })
      .select(`
        *,
        category:category_id(name),
        employee:employee_id(first_name, last_name)
      `)
      .single();
    if (error) throw error;
    return mapService(data);
  },

  async update(id: string, dto: UpdateServiceDTO): Promise<Service> {
    const { data, error } = await (supabase as any)
      .from(TABLE)
      .update({
        ...dto,
        employee_id: dto.employee_id === undefined ? undefined : (dto.employee_id ?? null),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(`
        *,
        category:category_id(name),
        employee:employee_id(first_name, last_name)
      `)
      .single();
    if (error) throw error;
    return mapService(data);
  },

  async softDelete(id: string): Promise<void> {
    const { error } = await (supabase as any)
      .from(TABLE)
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },
};

function mapService(raw: any): Service {
  return {
    ...raw,
    category_name: raw.category?.name ?? '',
    employee_name: raw.employee
      ? `${raw.employee.first_name} ${raw.employee.last_name}`
      : '',
  };
}
