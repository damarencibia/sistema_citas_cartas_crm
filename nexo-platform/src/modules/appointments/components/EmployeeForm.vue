<template>
  <v-dialog
    :model-value="visible"
    max-width="560"
    persistent
    @update:model-value="emit('close')"
  >
    <v-card>
      <v-card-title class="text-h6 d-flex align-center">
        {{ isEditing ? 'Editar Empleado' : 'Nuevo Empleado' }}
        <v-spacer />
        <v-btn
          icon="mdi-close"
          size="small"
          variant="text"
          @click="emit('close')"
        />
      </v-card-title>
      <v-card-text>
        <v-form ref="formRef" @submit.prevent="onSubmit">
          <v-row>
            <v-col cols="6">
              <v-text-field
                v-model="localForm.first_name"
                label="Nombre *"
                :rules="[(v) => !!v || 'Requerido']"
                density="comfortable"
              />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model="localForm.last_name"
                label="Apellidos *"
                :rules="[(v) => !!v || 'Requerido']"
                density="comfortable"
              />
            </v-col>
          </v-row>
          <v-text-field
            v-model="localForm.email"
            label="Correo electrónico"
            type="email"
            density="comfortable"
            class="mb-1"
          />
          <v-text-field
            v-model="localForm.phone"
            label="Teléfono (opcional)"
            density="comfortable"
            class="mb-1"
          />
          <v-text-field
            v-model="localForm.color"
            label="Color en agenda"
            type="color"
            density="comfortable"
            class="mb-1"
          />
          <v-select
            v-model="localForm.service_ids"
            :items="serviceOptions"
            item-title="text"
            item-value="value"
            label="Servicios que realiza"
            multiple
            chips
            closable-chips
            density="comfortable"
            class="mb-1"
          />
          <v-switch
            v-model="localForm.is_active"
            label="Activo"
            color="primary"
            density="compact"
            hide-details
            class="mb-1"
          />
        </v-form>
      </v-card-text>
      <v-card-actions class="pa-4 pt-0">
        <v-spacer />
        <v-btn variant="text" @click="emit('close')">Cancelar</v-btn>
        <v-btn
          color="primary"
          variant="flat"
          :loading="submitting"
          @click="onSubmit"
        >
          {{ isEditing ? 'Guardar' : 'Crear' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue';
import type { Employee } from '../types/employee.types';

export interface EmployeeFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  color: string;
  service_ids: string[];
  is_active: boolean;
}

const props = defineProps<{
  visible: boolean;
  employee?: Employee | null;
  serviceOptions: { value: string; text: string }[];
}>();

const emit = defineEmits<{
  close: [];
  save: [data: EmployeeFormData];
}>();

const isEditing = ref(false);
const submitting = ref(false);
const formRef = ref();

const localForm = reactive<EmployeeFormData>({
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  color: '#1976D2',
  service_ids: [],
  is_active: true,
});

watch(
  () => props.employee,
  (e) => {
    if (e) {
      isEditing.value = true;
      localForm.first_name = e.first_name;
      localForm.last_name = e.last_name;
      localForm.email = e.email ?? '';
      localForm.phone = e.phone ?? '';
      localForm.color = e.color;
      localForm.is_active = e.is_active;
    } else {
      isEditing.value = false;
      localForm.first_name = '';
      localForm.last_name = '';
      localForm.email = '';
      localForm.phone = '';
      localForm.color = '#1976D2';
      localForm.service_ids = [];
      localForm.is_active = true;
    }
  },
  { immediate: true },
);

async function onSubmit() {
  const { valid } = await formRef.value.validate();
  if (!valid) return;
  submitting.value = true;
  emit('save', { ...localForm });
  submitting.value = false;
}
</script>
