import type { Database } from '@/shared/types/supabase.gen';

export type Category = Database['public']['Tables']['categories']['Row'];

export type CreateCategoryDTO = Omit<Database['public']['Tables']['categories']['Insert'], 'id' | 'created_at' | 'updated_at' | 'deleted_at'>;

export type UpdateCategoryDTO = Partial<CreateCategoryDTO> & { id: string };
