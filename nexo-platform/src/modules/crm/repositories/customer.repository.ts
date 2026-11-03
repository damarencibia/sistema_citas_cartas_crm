import { supabase } from '@/shared/api/supabase.client';
import type {
  Customer,
  CustomerBooking,
  CreateCustomerDTO,
  LoyaltyConfig,
  LoyaltyPoint,
  Tag,
  UpdateCustomerDTO,
} from '../types/customer.types';

const CUSTOMERS = 'customers';
const TAGS = 'tags';
const CUSTOMER_TAGS = 'customer_tags';
const LOYALTY = 'loyalty_points';

export const customerRepository = {
  async getAll(tenantId: string): Promise<Customer[]> {
    const { data, error } = await supabase
      .from(CUSTOMERS)
      .select('*')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as Customer[];
  },

  async getById(id: string): Promise<Customer | null> {
    const { data, error } = await supabase
      .from(CUSTOMERS)
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();
    if (error) throw error;
    return (data as unknown as Customer) ?? null;
  },

  async create(dto: CreateCustomerDTO, tenantId: string): Promise<Customer> {
    const { data, error } = await supabase
      .from(CUSTOMERS)
      .insert({
        tenant_id: tenantId,
        first_name: dto.first_name.trim(),
        last_name: dto.last_name.trim(),
        email: dto.email?.trim() || null,
        phone: dto.phone?.trim() || null,
        notes: dto.notes?.trim() || null,
      })
      .select('*')
      .single();
    if (error) throw error;
    return data as unknown as Customer;
  },

  async update(id: string, dto: UpdateCustomerDTO): Promise<Customer> {
    const payload: UpdateCustomerDTO & { updated_at: string } = {
      ...dto,
      updated_at: new Date().toISOString(),
    };
    if (dto.email !== undefined) payload.email = dto.email?.trim() || null;
    if (dto.phone !== undefined) payload.phone = dto.phone?.trim() || null;
    if (dto.notes !== undefined) payload.notes = dto.notes?.trim() || null;
    const { data, error } = await supabase
      .from(CUSTOMERS)
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data as unknown as Customer;
  },

  async softDelete(id: string): Promise<void> {
    const { error } = await supabase
      .from(CUSTOMERS)
      .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },

  /** Timeline del cliente: reservas con nombre de servicio (últimas 50) */
  async getBookings(customerId: string): Promise<CustomerBooking[]> {
    const { data, error } = await supabase
      .from('bookings')
      .select('id, date, start_time, status, created_at, service:service_id(name)')
      .eq('customer_id', customerId)
      .is('deleted_at', null)
      .order('date', { ascending: false })
      .limit(50);
    if (error) throw error;
    return (data ?? []).map((raw: Record<string, any>) => ({
      id: raw.id,
      date: raw.date,
      start_time: raw.start_time,
      status: raw.status,
      created_at: raw.created_at,
      service_name: (raw.service as { name?: string } | null)?.name ?? 'Servicio',
    }));
  },

  /** Puntos de fidelización del cliente (últimos 50) */
  async getLoyaltyPoints(customerId: string): Promise<LoyaltyPoint[]> {
    const { data, error } = await supabase
      .from(LOYALTY)
      .select('id, points, reason, expires_at, created_at')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return (data ?? []) as unknown as LoyaltyPoint[];
  },

  async getLoyaltyConfig(tenantId: string): Promise<LoyaltyConfig | null> {
    const { data, error } = await supabase
      .from('loyalty_config')
      .select('is_active, points_per_visit, points_per_currency, points_to_currency, currency_unit, redemption_unit, welcome_points, expiry_months')
      .eq('tenant_id', tenantId)
      .single();
    // La configuración puede no existir aún (PGRST116): no es un error de usuario
    if (error && error.code !== 'PGRST116') throw error;
    return (data as unknown as LoyaltyConfig) ?? null;
  },

  async getTags(tenantId: string): Promise<Tag[]> {
    const { data, error } = await supabase
      .from(TAGS)
      .select('id, name, color, is_system')
      .eq('tenant_id', tenantId)
      .order('name');
    if (error) throw error;
    return (data ?? []) as unknown as Tag[];
  },

  async getCustomerTagIds(customerId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from(CUSTOMER_TAGS)
      .select('tag_id')
      .eq('customer_id', customerId);
    if (error) throw error;
    return (data ?? []).map((row: { tag_id: string }) => row.tag_id);
  },

  /** Reemplazo completo de etiquetas de un cliente (insert + delete diferenciales) */
  async setCustomerTags(customerId: string, tenantId: string, tagIds: string[]): Promise<void> {
    const current = await this.getCustomerTagIds(customerId);
    const toInsert = tagIds.filter((id) => !current.includes(id));
    const toRemove = current.filter((id) => !tagIds.includes(id));
    if (toInsert.length > 0) {
      const { error } = await supabase
        .from(CUSTOMER_TAGS)
        .insert(toInsert.map((tag_id) => ({ customer_id: customerId, tag_id })));
      if (error) throw error;
    }
    if (toRemove.length > 0) {
      const { error } = await supabase
        .from(CUSTOMER_TAGS)
        .delete()
        .eq('customer_id', customerId)
        .in('tag_id', toRemove);
      if (error) throw error;
    }
    void tenantId;
  },

  async createTag(tenantId: string, name: string, color: string | null): Promise<Tag> {
    const { data, error } = await supabase
      .from(TAGS)
      .insert({ tenant_id: tenantId, name: name.trim(), color: color ?? '#6b7280' })
      .select('id, name, color, is_system')
      .single();
    if (error) throw error;
    return data as unknown as Tag;
  },

  async updateTag(id: string, name: string, color: string | null): Promise<Tag> {
    const { data, error } = await supabase
      .from(TAGS)
      .update({ name: name.trim(), color: color ?? '#6b7280' })
      .eq('id', id)
      .select('id, name, color, is_system')
      .single();
    if (error) throw error;
    return data as unknown as Tag;
  },

  /** Elimina asignaciones primero para no dejar huérfanos en customer_tags */
  async deleteTag(id: string): Promise<void> {
    const { error: unlinkError } = await supabase.from(CUSTOMER_TAGS).delete().eq('tag_id', id);
    if (unlinkError) throw unlinkError;
    const { error } = await supabase.from(TAGS).delete().eq('id', id);
    if (error) throw error;
  },
};
