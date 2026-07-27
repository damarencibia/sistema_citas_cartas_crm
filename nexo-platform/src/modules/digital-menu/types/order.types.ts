import type { Database } from '@/shared/types/supabase.gen';

export type OrderItem = Database['public']['Tables']['order_items']['Row'];
export type Order = Database['public']['Tables']['orders']['Row'] & { items?: OrderItem[]; table?: Database['public']['Tables']['tables']['Row'] | null };

export type OrderItemExtra = {
  id: string;
  name: string;
  price: number;
};

export type CreateOrderItemDTO = {
  product_id?: string | null;
  product_name: string;
  variant_name?: string | null;
  quantity: number;
  unit_price: number;
  subtotal: number;
  extras?: OrderItemExtra[] | null;
  notes?: string | null;
};

export type CreateOrderDTO = {
  tenant_id: string;
  customer_name: string;
  customer_email?: string | null;
  customer_phone?: string | null;
  notes?: string | null;
  table_id?: string | null;
  total_amount: number;
  items: CreateOrderItemDTO[];
};

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
