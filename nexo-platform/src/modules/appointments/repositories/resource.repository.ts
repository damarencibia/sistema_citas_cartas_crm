import { supabase } from '@/shared/api/supabase.client';
import type { Resource, CreateResourceDTO, ServiceResource, CreateServiceResourceDTO } from '../types/resource.types';

const TABLE = 'resources' as const;
const JUNCTION_TABLE = 'service_resources' as const;

export const resourceRepository = {
  async getAll(tenantId: string): Promise<Resource[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('tenant_id', tenantId)
      .order('name');
    if (error) throw error;
    return (data ?? []) as Resource[];
  },

  async getActive(tenantId: string): Promise<Resource[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('name');
    if (error) throw error;
    return (data ?? []) as Resource[];
  },

  async create(tenantId: string, dto: CreateResourceDTO): Promise<Resource> {
    const { data, error } = await supabase
      .from(TABLE)
      .insert({
        tenant_id: tenantId,
        name: dto.name,
        type: dto.type ?? 'room',
        capacity: dto.capacity ?? 1,
        description: dto.description ?? null,
        is_active: true,
      })
      .select()
      .single();
    if (error) throw error;
    return data as Resource;
  },

  async update(id: string, dto: Partial<CreateResourceDTO & { is_active: boolean }>): Promise<Resource> {
    const { data, error } = await supabase
      .from(TABLE)
      .update({ ...dto, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Resource;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    if (error) throw error;
  },

  // --- Service-Resource junction ---

  async getServiceResources(tenantId: string, serviceId?: string): Promise<ServiceResource[]> {
    let query = supabase
      .from(JUNCTION_TABLE)
      .select('*')
      .eq('tenant_id', tenantId);
    if (serviceId) query = query.eq('service_id', serviceId);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as ServiceResource[];
  },

  async assignResource(tenantId: string, dto: CreateServiceResourceDTO): Promise<ServiceResource> {
    const { data, error } = await supabase
      .from(JUNCTION_TABLE)
      .insert({
        tenant_id: tenantId,
        service_id: dto.service_id,
        resource_id: dto.resource_id,
        quantity: dto.quantity ?? 1,
      })
      .select()
      .single();
    if (error) throw error;
    return data as ServiceResource;
  },

  async removeServiceResource(id: string): Promise<void> {
    const { error } = await supabase.from(JUNCTION_TABLE).delete().eq('id', id);
    if (error) throw error;
  },
};
