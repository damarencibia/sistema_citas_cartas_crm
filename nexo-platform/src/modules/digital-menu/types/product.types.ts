import type { Database } from '@/shared/types/supabase.gen';

export type Product = Database['public']['Tables']['products']['Row'];
export type ProductVariant = Database['public']['Tables']['product_variants']['Row'];
export type ExtraGroup = Database['public']['Tables']['extra_groups']['Row'];
export type ExtraOption = Database['public']['Tables']['extras']['Row'];

export type CreateProductDTO = Omit<Database['public']['Tables']['products']['Insert'], 'id' | 'created_at' | 'updated_at' | 'deleted_at'>;
export type UpdateProductDTO = Partial<CreateProductDTO> & { id: string };

export type FullProduct = Product & {
  variants?: ProductVariant[];
  extras?: Array<ExtraGroup & { items: ExtraOption[] }>;
};
