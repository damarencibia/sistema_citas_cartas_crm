import type { BaseEntity } from '@/shared/types';

export interface ServiceCategory extends BaseEntity {
  tenant_id: string;
  name: string;
  description: string | null;
  icon: string;
  sort_order: number;
  is_active: boolean;
}

export interface CreateServiceCategoryDTO {
  name: string;
  description?: string;
  icon?: string;
}

export type UpdateServiceCategoryDTO = Partial<CreateServiceCategoryDTO>;
