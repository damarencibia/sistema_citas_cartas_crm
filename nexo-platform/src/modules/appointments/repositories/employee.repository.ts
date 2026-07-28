import { supabase } from '@/shared/api/supabase.client';
import type { Employee, CreateEmployeeDTO, UpdateEmployeeDTO } from '../types/employee.types';
import type { Service } from '../types/service.types';

const TABLE = 'employees' as const;

export const employeeRepository = {
  async getAll(): Promise<Employee[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .is('deleted_at', null)
      .order('first_name');
    if (error) throw error;
    return (data ?? []) as Employee[];
  },

  async getById(id: string): Promise<Employee | null> {
    const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).single();
    if (error) throw error;
    return data as Employee | null;
  },

  async getServicesByEmployee(employeeId: string): Promise<Service[]> {
    const { data, error } = await (supabase as any)
      .from('services')
      .select(`
        *,
        category:category_id(name)
      `)
      .eq('employee_id', employeeId)
      .is('deleted_at', null)
      .order('sort_order');
    if (error) throw error;
    return (data ?? []).map((s: any) => ({
      ...s,
      category_name: s.category?.name ?? '',
    })) as Service[];
  },

  async getEmployeesByServiceName(serviceName: string): Promise<Employee[]> {
    const { data, error } = await (supabase as any)
      .from('services')
      .select('employee:employee_id(*)')
      .eq('name', serviceName)
      .is('deleted_at', null)
      .not('employee_id', 'is', null);
    if (error) throw error;
    return (data ?? [])
      .map((row: any) => row.employee)
      .filter((e: any) => e && !e.deleted_at && e.is_active) as Employee[];
  },

  async create(dto: CreateEmployeeDTO, tenantId: string): Promise<Employee> {
    const { data, error } = await supabase
      .from(TABLE)
      .insert({
        tenant_id: tenantId,
        first_name: dto.first_name,
        last_name: dto.last_name,
        email: dto.email ?? null,
        phone: dto.phone ?? null,
        color: dto.color ?? '#1976D2',
      } as any)
      .select()
      .single();
    if (error) throw error;
    return data as Employee;
  },

  async update(id: string, dto: UpdateEmployeeDTO): Promise<Employee> {
    const { data, error } = await supabase
      .from(TABLE)
      .update({ ...dto, updated_at: new Date().toISOString() } as any)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Employee;
  },

  async getAllWithRoles(): Promise<Employee[]> {
    const { data, error } = await (supabase as any)
      .from('employees')
      .select('*, user:user_id(role, supabase_user_id)')
      .is('deleted_at', null)
      .order('first_name');
    if (error) throw error;
    return (data ?? []).map((e: any) => ({
      ...e,
      role: e.user?.role ?? 'employee',
      supabase_user_id: e.user?.supabase_user_id ?? null,
      user: undefined,
    })) as Employee[];
  },

  async softDelete(id: string): Promise<void> {
    const { error } = await supabase
      .from(TABLE)
      .update({ deleted_at: new Date().toISOString() } as any)
      .eq('id', id);
    if (error) throw error;
  },
};
