<template>
  <div>
    <PageHeader title="Empleados" subtitle="Gestiona los empleados de tu negocio">
      <template #actions>
        <v-btn color="primary" @click="openCreate">
          <v-icon start>mdi-plus</v-icon>
          Nuevo Empleado
        </v-btn>
      </template>
    </PageHeader>

    <div v-if="employeeStore.loading" class="text-center pa-8">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <div v-else-if="employeeStore.employees.length === 0" class="text-center pa-8">
      <v-icon size="64" color="medium-emphasis">mdi-account-group-outline</v-icon>
      <p class="text-body-1 text-medium-emphasis mt-4">No hay empleados registrados</p>
      <v-btn
        color="primary"
        variant="flat"
        class="mt-4"
        @click="openCreate"
      >
        Agregar Primer Empleado
      </v-btn>
    </div>

    <v-card v-else>
      <v-list lines="two">
        <v-list-item
          v-for="employee in employeeStore.employees"
          :key="employee.id"
          :title="`${employee.first_name} ${employee.last_name}`"
          :subtitle="employee.email || 'Sin email'"
        >
          <template #prepend>
            <v-avatar :color="employee.color" size="40">
              <span class="text-white text-body-2">
                {{ employee.first_name[0] }}{{ employee.last_name[0] }}
              </span>
            </v-avatar>
          </template>
          <template #append>
            <v-chip
              v-if="!employee.is_active"
              color="error"
              size="small"
              class="mr-2"
            >
              Inactivo
            </v-chip>
            <v-btn
              icon="mdi-pencil"
              size="small"
              variant="text"
              @click="openEdit(employee)"
            />
            <v-btn
              icon="mdi-delete"
              size="small"
              variant="text"
              color="error"
              @click="onDelete(employee)"
            />
          </template>
        </v-list-item>
      </v-list>
    </v-card>

    <EmployeeForm
      :visible="showForm"
      :employee="editingEmployee"
      @close="closeForm"
      @save="onSave"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import PageHeader from '@/shared/components/PageHeader.vue';
import { useNotification } from '@/shared/composables/useNotification';
import { useConfirm } from '@/shared/composables/useConfirm';
import { useEmployeeStore } from '../stores/employee.store';
import EmployeeForm from '../components/EmployeeForm.vue';
import type { Employee, CreateEmployeeDTO } from '../types/employee.types';

const employeeStore = useEmployeeStore();
const notification = useNotification();
const { confirm } = useConfirm();

const showForm = ref(false);
const editingEmployee = ref<Employee | null>(null);

onMounted(async () => {
  await employeeStore.fetchEmployees();
});

function openCreate() {
  editingEmployee.value = null;
  showForm.value = true;
}

async function openEdit(employee: Employee) {
  editingEmployee.value = employee;
  showForm.value = true;
}

function closeForm() {
  showForm.value = false;
  editingEmployee.value = null;
}

async function onSave(dto: CreateEmployeeDTO) {
  try {
    if (editingEmployee.value) {
      await employeeStore.updateEmployee(editingEmployee.value.id, dto);
      notification.success('Empleado actualizado');
    } else {
      await employeeStore.createEmployee(dto);
      notification.success('Empleado creado');
    }
    closeForm();
  } catch {
    notification.error('Error al guardar empleado');
  }
}

async function onDelete(employee: Employee) {
  const ok = await confirm(`¿Eliminar al empleado "${employee.first_name} ${employee.last_name}"?`);
  if (!ok) return;
  try {
    await employeeStore.deleteEmployee(employee.id);
    notification.success('Empleado eliminado');
  } catch {
    notification.error('Error al eliminar empleado');
  }
}
</script>
