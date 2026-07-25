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

export interface EmployeeService {
  id: string;
  employee_id: string;
  service_id: string;
  created_at: string;
}

export interface CreateEmployeeDTO {
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  color?: string;
  service_ids?: string[];
}

export type UpdateEmployeeDTO = Partial<CreateEmployeeDTO>;
