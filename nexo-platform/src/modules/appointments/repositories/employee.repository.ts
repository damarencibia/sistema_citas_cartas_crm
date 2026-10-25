import { supabase } from '@/shared/api/supabase.client';
import { useAuthStore } from '@/shared/stores/auth.store';
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
    // Disponibilidad real del empleado: vía employee_services
    const { data, error } = await (supabase as any)
      .from('employee_services')
      .select(`
        service:service_id(
          *,
          category:category_id(name)
        )
      `)
      .eq('employee_id', employeeId);
    if (error) throw error;
    return (data ?? [])
      .map((row: any) => row.service)
      .filter((s: any) => s && !s.deleted_at)
      .map((s: any) => ({ ...s, category_name: s.category?.name ?? '' }));
  },

  async getCategoriesByEmployee(employeeId: string): Promise<Employee['categories']> {
    const { data, error } = await (supabase as any)
      .from('employee_categories')
      .select(`category:category_id(id, name, icon)`)
      .eq('employee_id', employeeId);
    if (error) throw error;
    return (data ?? [])
      .map((row: any) => row.category)
      .filter(Boolean);
  },

  async getEmployeesByService(serviceId: string): Promise<Employee[]> {
    // Empleados que realizan un servicio (disponibilidad para reservar)
    const { data, error } = await (supabase as any)
      .from('employee_services')
      .select(`employee:employee_id(*)`)
      .eq('service_id', serviceId);
    if (error) throw error;
    return (data ?? [])
      .map((row: any) => row.employee)
      .filter((e: any) => e && !e.deleted_at && e.is_active);
  },

  async setServiceEnabled(employeeId: string, serviceId: string, enabled: boolean): Promise<void> {
    if (enabled) {
      const { error } = await (supabase as any)
        .from('employee_services')
        .upsert(
          { employee_id: employeeId, service_id: serviceId },
          { ignoreDuplicates: true },
        );
      if (error) throw error;
    } else {
      const { error } = await (supabase as any)
        .from('employee_services')
        .delete()
        .eq('employee_id', employeeId)
        .eq('service_id', serviceId);
      if (error) throw error;
    }
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
      .select(`
        *,
        user:user_id(role, supabase_user_id, initial_password_pending),
        employee_categories(category_id, category:category_id(id, name, icon)),
        employee_services(service_id)
      `)
      .is('deleted_at', null)
      .order('first_name');
    if (error) throw error;
    return (data ?? []).map((e: any) => ({
      ...e,
      role: e.user?.role ?? 'employee',
      supabase_user_id: e.user?.supabase_user_id ?? null,
      initial_password_pending: e.user?.initial_password_pending ?? false,
      categories: (e.employee_categories ?? [])
        .map((c: any) => c.category)
        .filter(Boolean),
      category_ids: (e.employee_categories ?? []).map((c: any) => c.category_id),
      enabled_service_ids: (e.employee_services ?? []).map((s: any) => s.service_id),
      employee_categories: undefined,
      employee_services: undefined,
      user: undefined,
    })) as Employee[];
  },

  /**
   * Reconcilia el vínculo del empleado con categorías y sincroniza
   * employee_services: autohabilita los servicios de las categorías
   * nuevas y retira los vínculos de servicios fuera de ellas.
   */
  async updateCategories(employeeId: string, categoryIds: string[]): Promise<void> {
    const unique = [...new Set(categoryIds)];

    // 1. Reemplaza las categorías asignadas
    await (supabase as any)
      .from('employee_categories')
      .delete()
      .eq('employee_id', employeeId);
    if (unique.length > 0) {
      const { error: insertError } = await (supabase as any)
        .from('employee_categories')
        .insert(unique.map((cid) => ({ employee_id: employeeId, category_id: cid })));
      if (insertError) throw insertError;
    }

    // 2. Sincroniza employee_services con las categorías vigentes
    const { data: enabledRows, error: enabledError } = await (supabase as any)
      .from('employee_services')
      .select('service_id')
      .eq('employee_id', employeeId);
    if (enabledError) throw enabledError;
    const enabledIds = new Set((enabledRows ?? []).map((r: any) => r.service_id));

    // Servicios dentro de las categorías asignadas (no eliminados)
    let assignableIds: string[] = [];
    if (unique.length > 0) {
      const { data: catServices, error: catServicesError } = await (supabase as any)
        .from('services')
        .select('id')
        .in('category_id', unique)
        .is('deleted_at', null);
      if (catServicesError) throw catServicesError;
      assignableIds = (catServices ?? []).map((s: any) => s.id);
    }
    const assignable = new Set(assignableIds);

    // Retira vínculos fuera de sus categorías
    const toRemove = ([...enabledIds] as string[]).filter((id) => !assignable.has(id));
    if (toRemove.length > 0) {
      const { error: removeError } = await (supabase as any)
        .from('employee_services')
        .delete()
        .eq('employee_id', employeeId)
        .in('service_id', toRemove);
      if (removeError) throw removeError;
    }

    // Autohabilita los servicios nuevos de las categorías
    const toAdd = assignableIds.filter((id) => !enabledIds.has(id));
    if (toAdd.length > 0) {
      const { error: addError } = await (supabase as any)
        .from('employee_services')
        .upsert(
          toAdd.map((id) => ({ employee_id: employeeId, service_id: id })),
          { ignoreDuplicates: true },
        );
      if (addError) throw addError;
    }
  },

  async softDelete(id: string): Promise<void> {
    const authStore = useAuthStore();
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const token = authStore.session?.access_token;
    if (!token) throw new Error('No session available');

    const res = await fetch(`${supabaseUrl}/functions/v1/deactivate-team-member`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ employee_id: id }),
    });

    const result = await res.json();
    if (!res.ok || !result.success) {
      throw new Error(result.error || 'Error al eliminar el empleado');
    }
  },
};
