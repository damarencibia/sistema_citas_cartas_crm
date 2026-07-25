import { supabase } from '@/shared/api/supabase.client';
import type { Service, CreateServiceDTO, UpdateServiceDTO } from '../types/service.types';

const TABLE = 'services' as const;

export const serviceRepository = {
  async getAll(): Promise<Service[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .is('deleted_at', null)
      .order('sort_order');
    if (error) throw error;
    return (data ?? []) as Service[];
  },

  async getById(id: string): Promise<Service | null> {
    const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).single();
    if (error) throw error;
    return data as Service | null;
  },

  async create(dto: CreateServiceDTO, tenantId: string): Promise<Service> {
    const { data, error } = await supabase
      .from(TABLE)
      .insert({
        tenant_id: tenantId,
        name: dto.name,
        description: dto.description ?? null,
        duration_minutes: dto.duration_minutes,
        price: dto.price,
        color: dto.color ?? '#1976D2',
        category: dto.category ?? null,
        image_url: dto.image_url ?? null,
      } as any)
      .select()
      .single();
    if (error) throw error;
    return data as Service;
  },

  async update(id: string, dto: UpdateServiceDTO): Promise<Service> {
    const { data, error } = await supabase
      .from(TABLE)
      .update({ ...dto, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Service;
  },

  async softDelete(id: string): Promise<void> {
    const { error } = await supabase
      .from(TABLE)
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },
};
