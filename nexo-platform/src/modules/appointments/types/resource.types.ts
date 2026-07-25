import type { BaseEntity } from '@/shared/types';

export interface Resource extends BaseEntity {
  tenant_id: string;
  name: string;
  type: 'room' | 'equipment' | 'vehicle' | 'other';
  capacity: number;
  description: string | null;
  is_active: boolean;
}

export interface CreateResourceDTO {
  name: string;
  type?: Resource['type'];
  capacity?: number;
  description?: string;
  is_active?: boolean;
}

export type UpdateResourceDTO = Partial<CreateResourceDTO>;

export interface ServiceResource {
  id: string;
  tenant_id: string;
  service_id: string;
  resource_id: string;
  quantity: number;
  created_at: string;
}

export interface CreateServiceResourceDTO {
  service_id: string;
  resource_id: string;
  quantity?: number;
}
