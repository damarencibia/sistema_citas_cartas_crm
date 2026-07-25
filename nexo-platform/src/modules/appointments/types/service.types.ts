import type { BaseEntity } from '@/shared/types';

export interface Service extends BaseEntity {
  tenant_id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number;
  color: string;
  category: string | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  max_participants: number;
  requires_approval: boolean;
}

export interface CreateServiceDTO {
  name: string;
  description?: string;
  duration_minutes: number;
  price: number;
  color?: string;
  category?: string;
  image_url?: string;
}

export type UpdateServiceDTO = Partial<CreateServiceDTO>;
