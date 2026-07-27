import { supabase } from '@/shared/api/supabase.client';

export const tenantRepository = {
  async uploadLogo(tenantId: string, file: File): Promise<string> {
    const path = `tenant-logos/${tenantId}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from('tenant-logos').upload(path, file, { cacheControl: '3600', upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from('tenant-logos').getPublicUrl(path);
    return data.publicUrl;
  },
};
