import { supabase } from '@/shared/api/supabase.client';
import type { Service, CreateServiceDTO, UpdateServiceDTO } from '../types/service.types';

const TABLE = 'services' as const;

export const serviceRepository = {
  async getAll(): Promise<Service[]> {
    const { data, error } = await (supabase as any)
      .from(TABLE)
      .select(`
        *,
        category:category_id(name)
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
        category:category_id(name)
      `)
      .eq('id', id)
      .single();
    if (error) throw error;
    return data ? mapService(data) : null;
  },

  // La disponibilidad vive en employee_services (el empleado elige
  // qué servicios ofrece); aquí los resolvemos por el join.
  async getByEmployee(employeeId: string): Promise<Service[]> {
    const { data, error } = await (supabase as any)
      .from('employee_services')
      .select(`
        service:service_id(
          *,
          category:category_id(name)
        )
      `)
      .eq('employee_id', employeeId);
    if (error) throw error;
    return (data ?? [])
      .map((row: any) => row.service)
      .filter((s: any) => s && !s.deleted_at)
      .map(mapService);
  },

  async getByCategory(categoryId: string): Promise<Service[]> {
    const { data, error } = await (supabase as any)
      .from(TABLE)
      .select(`
        *,
        category:category_id(name)
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
        image_url: dto.image_url ?? null,
        max_participants: dto.max_participants ?? 1,
        requires_approval: dto.requires_approval ?? false,
      })
      .select(`
        *,
        category:category_id(name)
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
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(`
        *,
        category:category_id(name)
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
  };
}
