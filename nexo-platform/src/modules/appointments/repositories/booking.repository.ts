import { supabase } from '@/shared/api/supabase.client';
import type { Database } from '@/shared/types/supabase.gen';
import type { Booking, CreateBookingDTO, BookingFilters, AvailableSlot, ClientBlockCheck, StatusChangedBy, BookingWindow, CreateBookingWindowDTO, WaitlistEntry, CreateWaitlistDTO, RecurringPattern, CreateRecurringDTO, RecurringInstance, BookingStatus } from '../types/booking.types';

const TABLE = 'bookings' as const;

type BookingUpdate = Database['public']['Tables']['bookings']['Update'];
type BookingInsert = Database['public']['Tables']['bookings']['Insert'];

const VALID_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  pending_approval: ['confirmed', 'cancelled'],
  confirmed: ['in_progress', 'cancelled', 'no_show'],
  in_progress: ['completed', 'cancelled', 'no_show'],
  completed: [],
  no_show: [],
  cancelled: [],
};

function computeEndTime(startTime: string, durationMinutes: number): string {
  const [hours, minutes] = startTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + durationMinutes;
  if (totalMinutes >= 24 * 60) {
    throw new Error('El servicio excede el horario laboral (cruza medianoche).');
  }
  const endH = Math.floor(totalMinutes / 60);
  const endM = totalMinutes % 60;
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}

export const bookingRepository = {
  async getByFilters(filters: BookingFilters): Promise<Booking[]> {
    let query = supabase
      .from(TABLE)
      .select('*, service:service_id(name, duration_minutes, color), employee:employee_id(first_name, last_name, color)')
      .is('deleted_at', null)
      .order('date', { ascending: true })
      .order('start_time', { ascending: true });

    if (filters.date) {
      query = query.eq('date', filters.date);
    }
    if (filters.date_from) {
      query = query.gte('date', filters.date_from);
    }
    if (filters.date_to) {
      query = query.lte('date', filters.date_to);
    }
    if (filters.employee_id) {
      query = query.eq('employee_id', filters.employee_id);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as unknown as Booking[];
  },

  async getById(id: string): Promise<Booking | null> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*, service:service_id(name, duration_minutes, color), employee:employee_id(first_name, last_name, color)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as unknown as Booking | null;
  },

  async create(dto: CreateBookingDTO, tenantId: string): Promise<Booking> {
    const { data: serviceData, error: serviceError } = await supabase
      .from('services')
      .select('duration_minutes, requires_approval')
      .eq('id', dto.service_id)
      .single();
    if (serviceError) throw serviceError;

    const duration = dto.custom_duration_minutes ?? serviceData.duration_minutes;
    const endTime = computeEndTime(dto.start_time, duration);

    const initialStatus = serviceData.requires_approval ? 'pending_approval' : 'confirmed';

    const insertPayload: BookingInsert = {
      tenant_id: tenantId,
      service_id: dto.service_id,
      employee_id: dto.employee_id,
      date: dto.date,
      start_time: dto.start_time,
      end_time: endTime,
      customer_name: dto.customer_name ?? null,
      customer_email: dto.customer_email ?? null,
      customer_phone: dto.customer_phone ?? null,
      notes: dto.notes ?? null,
      source: dto.source ?? 'manual',
      status: initialStatus,
      participant_count: dto.participant_count ?? 1,
      resource_id: dto.resource_id ?? null,
      custom_duration_minutes: dto.custom_duration_minutes ?? null,
    };

    const { data, error } = await supabase
      .from(TABLE)
      .insert(insertPayload)
      .select()
      .single();
    if (error) {
      if (error.message?.includes('check') || error.message?.includes('overlap')) {
        throw new Error('El empleado ya tiene una cita en ese horario.');
      }
      throw error;
    }
    return data as Booking;
  },

  async updateStatus(
    id: string,
    status: BookingStatus,
    reason?: string,
    cancelledBy: 'customer' | 'employee' | 'system' = 'employee',
  ): Promise<Booking> {
    const { data: current, error: fetchError } = await supabase
      .from(TABLE)
      .select('status')
      .eq('id', id)
      .single();
    if (fetchError) throw fetchError;

    const currentStatus = current.status as BookingStatus;
    const allowed = VALID_TRANSITIONS[currentStatus];
    if (allowed && !allowed.includes(status)) {
      throw new Error(`No se puede transicionar de "${currentStatus}" a "${status}".`);
    }

    const updatePayload: BookingUpdate = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (status === 'cancelled') {
      updatePayload.cancellation_reason = reason ?? null;
      updatePayload.cancelled_by = cancelledBy;
      updatePayload.cancelled_at = new Date().toISOString();
    }
    if (status === 'no_show') {
      updatePayload.no_show_at = new Date().toISOString();
    }
    const { data, error } = await supabase
      .from(TABLE)
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Booking;
  },

  async logStatusChange(
    tenantId: string,
    bookingId: string,
    oldStatus: string | null,
    newStatus: string,
    changedBy: StatusChangedBy,
    changedByName?: string,
    reason?: string,
  ): Promise<void> {
    const { error } = await supabase.from('booking_status_log').insert({
      tenant_id: tenantId,
      booking_id: bookingId,
      old_status: oldStatus,
      new_status: newStatus,
      changed_by: changedBy,
      changed_by_name: changedByName ?? null,
      reason: reason ?? null,
    });
    if (error) throw error;
  },

  async checkClientBlock(tenantId: string, customerEmail: string): Promise<ClientBlockCheck> {
    if (!customerEmail) return { is_blocked: false, blocked_until: null, no_show_count: 0 };
    const { data, error } = await supabase.rpc('is_client_blocked', {
      p_tenant_id: tenantId,
      p_customer_email: customerEmail,
    });
    if (error) throw error;
    const result = data?.[0];
    return {
      is_blocked: result?.is_blocked ?? false,
      blocked_until: result?.blocked_until ?? null,
      no_show_count: result?.no_show_count ?? 0,
    };
  },

  async countRecentNoShows(tenantId: string, customerEmail: string, days: number = 30): Promise<number> {
    if (!customerEmail) return 0;
    const { data, error } = await supabase.rpc('count_recent_no_shows', {
      p_tenant_id: tenantId,
      p_customer_email: customerEmail,
      p_days: days,
    });
    if (error) throw error;
    return (data as number) ?? 0;
  },

  async getNoShowCount(tenantId: string, customerEmail: string): Promise<number> {
    const { count, error } = await supabase
      .from(TABLE)
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .ilike('customer_email', customerEmail)
      .eq('status', 'no_show');
    if (error) throw error;
    return count ?? 0;
  },

  async getAppointmentConfig(tenantId: string): Promise<{ auto_start: boolean; grace_period_minutes: number; max_no_shows: number; block_duration_days: number } | null> {
    const { data, error } = await supabase
      .from('tenants')
      .select('config')
      .eq('id', tenantId)
      .single();
    if (error) throw error;
    const rawConfig = (data as { config: Record<string, unknown> | null })?.config;
    if (!rawConfig) return null;
    const appointments = rawConfig.appointments as Record<string, unknown> | undefined;
    if (!appointments) return null;

    const noShowPolicy = (appointments.no_show_policy ?? appointments) as Record<string, unknown>;

    return {
      auto_start: (appointments.auto_start as boolean) ?? false,
      grace_period_minutes: (noShowPolicy.grace_period_minutes as number) ?? 15,
      max_no_shows: (noShowPolicy.max_no_shows as number) ?? 2,
      block_duration_days: (noShowPolicy.block_duration_days as number) ?? 30,
    };
  },

  async createClientBlock(
    tenantId: string,
    customerEmail: string,
    blockedUntil: string,
    reason: string,
    noShowCount: number,
  ): Promise<void> {
    const { error } = await supabase.from('client_blocks').upsert({
      tenant_id: tenantId,
      customer_email: customerEmail,
      blocked_until: blockedUntil,
      reason,
      no_show_count: noShowCount,
    }, {
      onConflict: 'tenant_id,customer_email',
    });
    if (error) throw error;
  },

  async approveBooking(
    bookingId: string,
    approvedBy: string,
    reason?: string,
  ): Promise<Booking> {
    const { data, error } = await supabase
      .from(TABLE)
      .update({
        status: 'confirmed',
        updated_at: new Date().toISOString(),
      } as BookingUpdate)
      .eq('id', bookingId)
      .select()
      .single();
    if (error) throw error;

    await supabase.from('booking_approvals').insert({
      booking_id: bookingId,
      tenant_id: data.tenant_id,
      action: 'approved',
      approved_by: approvedBy,
      reason: reason ?? null,
    });

    return data as Booking;
  },

  async rejectBooking(
    bookingId: string,
    approvedBy: string,
    reason?: string,
  ): Promise<Booking> {
    const { data, error } = await supabase
      .from(TABLE)
      .update({
        status: 'cancelled',
        cancellation_reason: reason ?? 'Rechazado por administrador',
        cancelled_by: 'employee',
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as BookingUpdate)
      .eq('id', bookingId)
      .select()
      .single();
    if (error) throw error;

    await supabase.from('booking_approvals').insert({
      booking_id: bookingId,
      tenant_id: data.tenant_id,
      action: 'rejected',
      approved_by: approvedBy,
      reason: reason ?? null,
    });

    return data as Booking;
  },

  async getAvailableSlots(
    tenantId: string,
    employeeId: string,
    date: string,
    serviceDuration: number,
    serviceId?: string,
  ): Promise<AvailableSlot[]> {
    const { data, error } = await supabase.rpc('get_available_slots', {
      p_tenant_id: tenantId,
      p_employee_id: employeeId,
      p_date: date,
      p_service_duration: serviceDuration,
      p_service_id: serviceId ?? undefined,
    });
    if (error) throw error;
    return (data ?? []) as AvailableSlot[];
  },

  async getFullSlotGrid(
    tenantId: string,
    employeeId: string,
    date: string,
    serviceDuration: number,
    serviceId?: string,
  ): Promise<AvailableSlot[]> {
    const { data, error } = await (supabase as any).rpc('get_full_slot_grid', {
      p_tenant_id: tenantId,
      p_employee_id: employeeId,
      p_date: date,
      p_service_duration: serviceDuration,
      p_service_id: serviceId ?? undefined,
    });
    if (error) throw error;
    return (data ?? []) as AvailableSlot[];
  },

  async getByEmployeeAndDate(employeeId: string, date: string): Promise<Booking[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*, service:service_id(name, duration_minutes, color), employee:employee_id(first_name, last_name, color)')
      .eq('employee_id', employeeId)
      .eq('date', date)
      .not('status', 'eq', 'cancelled')
      .is('deleted_at', null)
      .order('start_time', { ascending: true });
    if (error) throw error;
    return (data ?? []) as unknown as Booking[];
  },

  async reassign(
    bookingId: string,
    newDate: string,
    newStartTime: string,
    serviceDuration: number,
  ): Promise<Booking> {
    const endTime = computeEndTime(newStartTime, serviceDuration);

    const { data, error } = await supabase
      .from(TABLE)
      .update({
        date: newDate,
        start_time: newStartTime,
        end_time: endTime,
        updated_at: new Date().toISOString(),
      } as BookingUpdate)
      .eq('id', bookingId)
      .select()
      .single();
    if (error) throw error;
    return data as Booking;
  },

  // --- Booking Windows ---

  async getBookingWindows(tenantId: string): Promise<BookingWindow[]> {
    const { data, error } = await supabase
      .from('booking_windows')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('start_date');
    if (error) throw error;
    return (data ?? []) as BookingWindow[];
  },

  async createBookingWindow(tenantId: string, dto: CreateBookingWindowDTO): Promise<BookingWindow> {
    const { data, error } = await supabase
      .from('booking_windows')
      .insert({
        tenant_id: tenantId,
        employee_id: dto.employee_id ?? null,
        service_id: dto.service_id ?? null,
        start_date: dto.start_date,
        end_date: dto.end_date,
        start_time: dto.start_time,
        end_time: dto.end_time,
        slot_mode: dto.slot_mode ?? 'fixed',
        slot_interval_minutes: dto.slot_interval_minutes ?? 30,
        is_active: true,
      })
      .select()
      .single();
    if (error) throw error;
    return data as BookingWindow;
  },

  async deleteBookingWindow(id: string): Promise<void> {
    const { error } = await supabase.from('booking_windows').delete().eq('id', id);
    if (error) throw error;
  },

  async hardDelete(id: string): Promise<void> {
    const { error } = await (supabase as any)
      .from('bookings')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // --- Waitlist ---

  async getWaitlist(tenantId: string): Promise<WaitlistEntry[]> {
    const { data, error } = await (supabase as any)
      .from('waitlist')
      .select('*, service:service_id(name, duration_minutes, color), employee:employee_id(first_name, last_name, color)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []) as unknown as WaitlistEntry[];
  },

  async joinWaitlist(tenantId: string, dto: CreateWaitlistDTO): Promise<WaitlistEntry> {
    const { count } = await (supabase as any)
      .from('waitlist')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('service_id', dto.service_id)
      .eq('preferred_date', dto.preferred_date)
      .eq('status', 'waiting');

    const position = (count ?? 0) + 1;

    const { data, error } = await (supabase as any)
      .from('waitlist')
      .insert({
        tenant_id: tenantId,
        service_id: dto.service_id,
        employee_id: dto.employee_id ?? null,
        preferred_date: dto.preferred_date,
        preferred_time_start: dto.preferred_time_start ?? null,
        preferred_time_end: dto.preferred_time_end ?? null,
        customer_name: dto.customer_name,
        customer_email: dto.customer_email,
        customer_phone: dto.customer_phone ?? null,
        position,
        status: 'waiting',
        preference: dto.preference ?? 'exact',
      })
      .select()
      .single();
    if (error) throw error;
    return data as unknown as WaitlistEntry;
  },

  async cancelWaitlistEntry(id: string): Promise<void> {
    const { error } = await (supabase as any).from('waitlist').delete().eq('id', id);
    if (error) throw error;
  },

  async removeWaitlistEntry(id: string): Promise<void> {
    const { error } = await (supabase as any).from('waitlist').delete().eq('id', id);
    if (error) throw error;
  },

  async promoteFromWaitlist(
    tenantId: string,
    serviceId: string,
    employeeId: string,
    date: string,
    slotStart: string,
    slotEnd: string,
  ): Promise<WaitlistEntry | null> {
    const { data, error } = await supabase.rpc('promote_from_waitlist', {
      p_tenant_id: tenantId,
      p_service_id: serviceId,
      p_employee_id: employeeId,
      p_date: date,
      p_slot_start: slotStart,
      p_slot_end: slotEnd,
    });
    if (error) throw error;
    const entry = data?.[0];
    return entry ? (entry as unknown as WaitlistEntry) : null;
  },

  async getWaitlistCount(
    tenantId: string,
    serviceId: string,
    employeeId: string,
    date: string,
  ): Promise<number> {
    const { data, error } = await supabase.rpc('get_waitlist_count', {
      p_tenant_id: tenantId,
      p_service_id: serviceId,
      p_employee_id: employeeId,
      p_date: date,
    });
    if (error) throw error;
    return (data as number) ?? 0;
  },

  async getWaitlistEntryByToken(token: string): Promise<WaitlistEntry | null> {
    const { data, error } = await (supabase as any)
      .from('waitlist')
      .select('*, service:service_id(name, duration_minutes, color, price), employee:employee_id(first_name, last_name, color)')
      .eq('offer_token', token)
      .single();
    if (error) return null;
    return data as unknown as WaitlistEntry | null;
  },

  async acceptWaitlistOffer(token: string): Promise<{ booking_id: string | null; error: string | null }> {
    const { data, error } = await (supabase as any).rpc('accept_waitlist_offer', {
      p_token: token,
    });
    if (error) throw error;
    const result = data?.[0];
    return {
      booking_id: result?.booking_id ?? null,
      error: result?.error ?? null,
    };
  },

  async declineWaitlistOffer(token: string): Promise<{ success: boolean; error: string | null }> {
    const { error } = await (supabase as any).from('waitlist').delete().eq('offer_token', token);
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, error: null };
  },

  // --- Recurring Bookings ---

  async getRecurringPatterns(tenantId: string): Promise<RecurringPattern[]> {
    const { data, error } = await supabase
      .from('recurring_booking_patterns')
      .select('*, service:service_id(name, duration_minutes, color), employee:employee_id(first_name, last_name, color)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as RecurringPattern[];
  },

  async createRecurringPattern(tenantId: string, dto: CreateRecurringDTO): Promise<RecurringPattern> {
    const { data, error } = await supabase
      .from('recurring_booking_patterns')
      .insert({
        tenant_id: tenantId,
        service_id: dto.service_id,
        employee_id: dto.employee_id,
        customer_name: dto.customer_name ?? null,
        customer_email: dto.customer_email ?? null,
        customer_phone: dto.customer_phone ?? null,
        frequency: dto.frequency,
        day_of_week: dto.day_of_week ?? null,
        day_of_month: dto.day_of_month ?? null,
        preferred_time: dto.preferred_time,
        start_date: dto.start_date,
        end_date: dto.end_date,
        total_occurrences: dto.total_occurrences ?? null,
        notes: dto.notes ?? null,
        status: 'active',
      })
      .select()
      .single();
    if (error) throw error;
    return data as RecurringPattern;
  },

  async generateRecurringInstances(patternId: string): Promise<number> {
    const { data, error } = await supabase.rpc('generate_recurring_instances', {
      p_pattern_id: patternId,
    });
    if (error) throw error;
    return (data as number) ?? 0;
  },

  async getRecurringInstances(patternId: string): Promise<RecurringInstance[]> {
    const { data, error } = await supabase
      .from('recurring_booking_instances')
      .select('*')
      .eq('pattern_id', patternId)
      .order('scheduled_date', { ascending: true });
    if (error) throw error;
    return (data ?? []) as RecurringInstance[];
  },

  async cancelRecurringPattern(patternId: string): Promise<void> {
    const { error } = await supabase
      .from('recurring_booking_patterns')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', patternId);
    if (error) throw error;
  },

  async skipRecurringInstance(instanceId: string): Promise<void> {
    const { error } = await supabase
      .from('recurring_booking_instances')
      .update({ status: 'skipped' })
      .eq('id', instanceId);
    if (error) throw error;
  },

};
