import { supabase } from '@/shared/api/supabase.client';
import type { Employee, CreateEmployeeDTO, UpdateEmployeeDTO } from '../types/employee.types';

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

  async getEmployeeServices(employeeId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('employee_services')
      .select('service_id')
      .eq('employee_id', employeeId);
    if (error) throw error;
    return (data ?? []).map((row) => row.service_id);
  },

  async getEmployeesByService(serviceId: string): Promise<Employee[]> {
    const { data, error } = await supabase
      .from('employee_services')
      .select('employee:employee_id(*)')
      .eq('service_id', serviceId);
    if (error) throw error;
    return (data ?? [])
      .map((row: any) => row.employee)
      .filter((e: any) => e && !e.deleted_at && e.is_active) as Employee[];
  },

  async create(dto: CreateEmployeeDTO, tenantId: string): Promise<Employee> {
    const { service_ids, ...employeeData } = dto;
    const { data, error } = await supabase
      .from(TABLE)
      .insert({
        tenant_id: tenantId,
        first_name: employeeData.first_name,
        last_name: employeeData.last_name,
        email: employeeData.email ?? null,
        phone: employeeData.phone ?? null,
        color: employeeData.color ?? '#1976D2',
      } as any)
      .select()
      .single();
    if (error) throw error;

    if (service_ids && service_ids.length > 0) {
      const { error: linkError } = await supabase.from('employee_services').insert(
        service_ids.map((service_id) => ({
          employee_id: data.id,
          service_id,
        })),
      );
      if (linkError) throw linkError;
    }

    return data as Employee;
  },

  async update(id: string, dto: UpdateEmployeeDTO): Promise<Employee> {
    const { service_ids, ...employeeData } = dto;
    const { data, error } = await supabase
      .from(TABLE)
      .update({ ...employeeData, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    if (service_ids !== undefined) {
      await supabase.from('employee_services').delete().eq('employee_id', id);
      if (service_ids.length > 0) {
        const { error: linkError } = await supabase.from('employee_services').insert(
          service_ids.map((service_id) => ({
            employee_id: id,
            service_id,
          })),
        );
        if (linkError) throw linkError;
      }
    }

    return data as Employee;
  },

  async softDelete(id: string): Promise<void> {
    const { error } = await supabase
      .from(TABLE)
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },
};
