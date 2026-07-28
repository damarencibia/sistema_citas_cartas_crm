import type { BaseEntity } from '@/shared/types';

export interface Employee extends BaseEntity {
  tenant_id: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  color: string;
  is_active: boolean;
}

export interface CreateEmployeeDTO {
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  color?: string;
}

export type UpdateEmployeeDTO = Partial<CreateEmployeeDTO>;
