import { supabase } from '@/shared/api/supabase.client';
import type { Order, CreateOrderDTO } from '../types/order.types';

const TABLE = 'orders' as const;
const ITEMS_TABLE = 'order_items' as const;

export const orderRepository = {
  async getByTenant(tenantId: string): Promise<Order[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*, table:table_id(*)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as Order[];
  },

  async getById(id: string): Promise<Order | null> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*, order_items(*), table:table_id(*)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as Order | null;
  },

  async create(dto: CreateOrderDTO): Promise<Order> {
    const { items, ...orderPayload } = dto;
    const { data: orderData, error: orderError } = await supabase
      .from(TABLE)
      .insert({ ...orderPayload, status: 'pending', created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as any)
      .select()
      .single();

    if (orderError || !orderData) throw orderError || new Error('No se creó el pedido');

    const orderId = orderData.id;
    const itemsPayload = items.map((item) => ({
      ...item,
      order_id: orderId,
    }));

    const { error: itemsError } = await supabase.from(ITEMS_TABLE).insert(itemsPayload as any);
    if (itemsError) throw itemsError;

    return this.getById(orderId) as Promise<Order>;
  },

  async updateStatus(id: string, status: string): Promise<Order> {
    const { data, error } = await supabase
      .from(TABLE)
      .update({ status, updated_at: new Date().toISOString() } as any)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Order;
  },
};

