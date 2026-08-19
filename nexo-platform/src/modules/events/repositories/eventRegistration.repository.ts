import { supabase } from '@/shared/api/supabase.client';
import type {
  CreateEventRegistrationDTO,
  EventRegCapacity,
  EventRegistration,
  EventRegistrationStatus,
} from '../types/event.types';

const TABLE = 'event_registrations' as const;

const VALID_TRANSITIONS: Record<EventRegistrationStatus, EventRegistrationStatus[]> = {
  confirmed: ['attended', 'cancelled'],
  waitlisted: ['confirmed', 'cancelled'],
  attended: [],
  cancelled: [],
};

export const eventRegistrationRepository = {
  async getByEventId(eventId: string): Promise<EventRegistration[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('event_id', eventId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(mapRegistration);
  },

  async getById(id: string): Promise<EventRegistration | null> {
    const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).single();
    if (error) throw error;
    return data ? mapRegistration(data) : null;
  },

  async getPublicByAccessToken(accessToken: string, tenantId: string): Promise<EventRegistration | null> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('access_token', accessToken)
      .eq('tenant_id', tenantId)
      .single();
    if (error) throw error;
    return data ? mapRegistration(data) : null;
  },

  async create(
    dto: CreateEventRegistrationDTO,
    tenantId: string,
    maxParticipants: number | null,
    currentConfirmedParticipants: number,
  ): Promise<EventRegistration> {
    const hasCapacity =
      maxParticipants === null || currentConfirmedParticipants + (dto.participant_count ?? 1) <= maxParticipants;
    const status: EventRegistrationStatus = hasCapacity ? 'confirmed' : 'waitlisted';
    const { data, error } = await supabase
      .from(TABLE)
      .insert({
        tenant_id: tenantId,
        event_id: dto.event_id,
        customer_name: dto.customer_name ?? null,
        customer_email: dto.customer_email ?? null,
        customer_phone: dto.customer_phone ?? null,
        participant_count: dto.participant_count ?? 1,
        status,
        access_token: crypto.randomUUID(),
        notes: dto.notes ?? null,
        whatsapp_consent: dto.whatsapp_consent ?? false,
      })
      .select()
      .single();
    if (error) throw error;
    return mapRegistration(data);
  },

  async updateStatus(id: string, status: EventRegistrationStatus): Promise<EventRegistration> {
    const { data: current, error: fetchError } = await supabase
      .from(TABLE)
      .select('status')
      .eq('id', id)
      .single();
    if (fetchError) throw fetchError;

    const currentStatus = current.status as EventRegistrationStatus;
    const allowed = VALID_TRANSITIONS[currentStatus];
    if (allowed && !allowed.includes(status)) {
      throw new Error(`No se puede transicionar de "${currentStatus}" a "${status}".`);
    }

    const { data, error } = await supabase
      .from(TABLE)
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return mapRegistration(data);
  },

  async cancel(id: string): Promise<EventRegistration> {
    const { data, error } = await supabase
      .from(TABLE)
      .update({
        status: 'cancelled',
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return mapRegistration(data);
  },

  async getCapacityInfo(eventId: string, maxParticipants: number | null): Promise<EventRegCapacity> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('status, participant_count')
      .eq('event_id', eventId)
      .is('deleted_at', null);
    if (error) throw error;
    return computeCapacity(data ?? [], maxParticipants);
  },

  async getCountsByEventIds(
    eventIds: string[],
    maxByEvent: Map<string, number | null>,
  ): Promise<Record<string, EventRegCapacity>> {
    if (eventIds.length === 0) return {};
    const { data, error } = await supabase
      .from(TABLE)
      .select('event_id, status, participant_count')
      .in('event_id', eventIds)
      .is('deleted_at', null);
    if (error) throw error;

    const perEvent = new Map<string, { status: string; participant_count: number }[]>();
    for (const row of data ?? []) {
      const list = perEvent.get(row.event_id) ?? [];
      list.push(row);
      perEvent.set(row.event_id, list);
    }
    const result: Record<string, EventRegCapacity> = {};
    for (const id of eventIds) {
      result[id] = computeCapacity(perEvent.get(id) ?? [], maxByEvent.get(id) ?? null);
    }
    return result;
  },
};

function computeCapacity(rows: { status: string; participant_count: number }[], maxParticipants: number | null): EventRegCapacity {
  let confirmedParticipants = 0;
  let confirmedCount = 0;
  let waitlistedCount = 0;
  for (const row of rows) {
    if (row.status === 'confirmed') {
      confirmedCount += 1;
      confirmedParticipants += row.participant_count;
    } else if (row.status === 'waitlisted') {
      waitlistedCount += 1;
    }
  }
  return {
    confirmed_count: confirmedCount,
    waitlisted_count: waitlistedCount,
    total_participants: confirmedParticipants,
    max_participants: maxParticipants,
    spots_left: maxParticipants === null ? null : Math.max(0, maxParticipants - confirmedParticipants),
  };
}

function mapRegistration(raw: Record<string, unknown>): EventRegistration {
  return raw as unknown as EventRegistration;
}