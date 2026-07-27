import { supabase } from '@/shared/api/supabase.client';
import type { Product, CreateProductDTO, UpdateProductDTO, ProductVariant, ExtraGroup, ExtraOption } from '../types/product.types';

const TABLE = 'products' as const;

export const productRepository = {
  async getByTenant(tenantId: string): Promise<Product[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return (data ?? []) as Product[];
  },

  async getWithRelations(id: string): Promise<Product & { variants: ProductVariant[]; extras: Array<ExtraGroup & { items: ExtraOption[] }> }> {
    const { data, error } = await supabase
      .from(TABLE)
      .select(`*, product_variants(*), extra_groups(*, extras(*))`)
      .eq('id', id)
      .single();
    if (error || !data) throw error ?? new Error('No se encontró el producto');

    const raw = data as Product & {
      product_variants?: ProductVariant[];
      extra_groups?: Array<ExtraGroup & { extras?: ExtraOption[] }>;
    };

    return {
      ...raw,
      variants: raw.product_variants ?? [],
      extras: (raw.extra_groups ?? []).map((group) => ({
        ...group,
        items: group.extras ?? [],
      })),
    };
  },

  async create(payload: CreateProductDTO): Promise<Product> {
    const { data, error } = await supabase.from(TABLE).insert(payload as any).select().single();
    if (error) throw error;
    return data as Product;
  },

  async update(payload: UpdateProductDTO): Promise<Product> {
    const { id, ...rest } = payload;
    const { data, error } = await supabase.from(TABLE).update(rest as any).eq('id', id).select().single();
    if (error) throw error;
    return data as Product;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    if (error) throw error;
  },

  async uploadImage(tenantId: string, file: File): Promise<string> {
    const path = `product-images/${tenantId}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from('product-images').upload(path, file, { cacheControl: '3600', upsert: true });
    if (error) throw error;
    const { data } = await supabase.storage.from('product-images').getPublicUrl(path);
    return data.publicUrl;
  },
};
