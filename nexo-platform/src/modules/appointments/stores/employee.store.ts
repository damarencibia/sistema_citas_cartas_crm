import { defineStore } from 'pinia';
import { employeeRepository } from '../repositories/employee.repository';
import { useAuthStore } from '@/shared/stores/auth.store';
import type { Employee, CreateEmployeeDTO, UpdateEmployeeDTO } from '../types/employee.types';
import type { Service } from '../types/service.types';

interface EmployeeStoreState {
  employees: Employee[];
  currentEmployee: Employee | null;
  employeeServices: Service[];
  loading: boolean;
}

export const useEmployeeStore = defineStore('appointments/employees', {
  state: (): EmployeeStoreState => ({
    employees: [],
    currentEmployee: null,
    employeeServices: [],
    loading: false,
  }),

  getters: {
    activeEmployees: (state) => state.employees.filter((e) => e.is_active),
  },

  actions: {
    async fetchEmployees() {
      this.loading = true;
      try {
        this.employees = await employeeRepository.getAll();
      } finally {
        this.loading = false;
      }
    },

    async fetchEmployee(id: string) {
      this.loading = true;
      try {
        this.currentEmployee = await employeeRepository.getById(id);
        this.employeeServices = await employeeRepository.getServicesByEmployee(id);
      } finally {
        this.loading = false;
      }
    },

    async fetchEmployeeServices(employeeId: string) {
      this.employeeServices = await employeeRepository.getServicesByEmployee(employeeId);
    },

    async getEmployeesByServiceName(serviceName: string): Promise<Employee[]> {
      return employeeRepository.getEmployeesByServiceName(serviceName);
    },

    async createEmployee(dto: CreateEmployeeDTO): Promise<Employee> {
      const authStore = useAuthStore();
      const tenantId = authStore.user?.tenant_id;
      if (!tenantId) throw new Error('No tenant ID available');
      const employee = await employeeRepository.create(dto, tenantId);
      this.employees.push(employee);
      return employee;
    },

    async updateEmployee(id: string, dto: UpdateEmployeeDTO): Promise<Employee> {
      const updated = await employeeRepository.update(id, dto);
      const index = this.employees.findIndex((e) => e.id === id);
      if (index !== -1) this.employees[index] = updated;
      if (this.currentEmployee?.id === id) this.currentEmployee = updated;
      return updated;
    },

    async deleteEmployee(id: string): Promise<void> {
      await employeeRepository.softDelete(id);
      this.employees = this.employees.filter((e) => e.id !== id);
      if (this.currentEmployee?.id === id) this.currentEmployee = null;
    },
  },
});
