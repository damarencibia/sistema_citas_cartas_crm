import type { Database } from '@/shared/types/supabase.gen';

export type Table = Database['public']['Tables']['tables']['Row'];
export type CreateTableDTO = Omit<Database['public']['Tables']['tables']['Insert'], 'id' | 'created_at' | 'updated_at' | 'deleted_at'>;
export type UpdateTableDTO = Partial<CreateTableDTO> & { id: string };
