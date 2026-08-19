import { supabase } from '@/shared/api/supabase.client';
import type { Event, CreateEventDTO, UpdateEventDTO } from '../types/event.types';

const TABLE = 'events';

export const eventRepository = {
  async getAll(tenantId: string): Promise<Event[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select(`
        *,
        category:category_id(name)
      `)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('event_date', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(mapEvent);
  },

  async getPublicByTenant(tenantId: string): Promise<Event[]> {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from(TABLE)
      .select(`
        *,
        category:category_id(name)
      `)
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .gte('event_date', today)
      .is('deleted_at', null)
      .order('event_date', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(mapEvent);
  },

  async getById(id: string): Promise<Event | null> {
    const { data, error } = await supabase
      .from(TABLE)
      .select(`
        *,
        category:category_id(name)
      `)
      .eq('id', id)
      .single();
    if (error) throw error;
    return data ? mapEvent(data) : null;
  },

  async create(dto: CreateEventDTO, tenantId: string): Promise<Event> {
    const { data, error } = await supabase
      .from(TABLE)
      .insert({
        tenant_id: tenantId,
        name: dto.name,
        description: dto.description ?? null,
        category_id: dto.category_id ?? null,
        max_participants: dto.max_participants ?? null,
        event_date: dto.event_date,
        start_time: dto.start_time,
        end_time: dto.end_time,
        reservation_open_date: dto.reservation_open_date ?? null,
        reservation_close_offset_minutes: dto.reservation_close_offset_minutes ?? null,
        is_active: dto.is_active ?? true,
      })
      .select(`
        *,
        category:category_id(name)
      `)
      .single();
    if (error) throw error;
    return mapEvent(data);
  },

  async update(id: string, dto: UpdateEventDTO): Promise<Event> {
    const { data, error } = await supabase
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
    return mapEvent(data);
  },

  async softDelete(id: string): Promise<void> {
    const { error } = await supabase
      .from(TABLE)
      .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },
};

function mapEvent(raw: Record<string, unknown>): Event {
  return {
    ...(raw as unknown as Event),
    category_name: (raw.category as { name?: string } | null)?.name ?? '',
  };
}