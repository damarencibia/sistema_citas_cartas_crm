<template>
  <v-dialog
    :model-value="visible"
    max-width="520"
    persistent
    @update:model-value="emit('close')"
  >
    <v-card>
      <v-card-title class="text-h6 d-flex align-center">
        {{ editing ? 'Editar Empleado' : 'Nuevo Empleado' }}
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
                label="Nombre"
                :rules="[(v) => !!v || 'Requerido']"
              />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model="localForm.last_name"
                label="Apellidos"
                :rules="[(v) => !!v || 'Requerido']"
              />
            </v-col>
          </v-row>
          <v-text-field
            v-model="localForm.email"
            label="Email (opcional)"
            type="email"
            class="mb-2"
          />
          <v-text-field v-model="localForm.phone" label="Teléfono (opcional)" class="mb-2" />
          <v-text-field
            v-model="localForm.color"
            label="Color en agenda"
            type="color"
            class="mb-2"
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
          {{ editing ? 'Guardar' : 'Crear' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue';
import { useServiceStore } from '../stores/service.store';
import type { Employee, CreateEmployeeDTO } from '../types/employee.types';

const props = defineProps<{
  visible: boolean;
  employee?: Employee | null;
  employeeServiceIds?: string[];
}>();

const emit = defineEmits<{
  close: [];
  save: [dto: CreateEmployeeDTO];
}>();

const serviceStore = useServiceStore();
const editing = ref(false);
const submitting = ref(false);
const formRef = ref();

const localForm = reactive<CreateEmployeeDTO>({
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  color: '#1976D2',
  service_ids: [],
});

const serviceOptions = computed(() =>
  serviceStore.activeServices.map((s) => ({
    value: s.id,
    text: s.name,
  })),
);

watch(
  () => props.employee,
  (e) => {
    if (e) {
      editing.value = true;
      localForm.first_name = e.first_name;
      localForm.last_name = e.last_name;
      localForm.email = e.email ?? '';
      localForm.phone = e.phone ?? '';
      localForm.color = e.color;
      localForm.service_ids = props.employeeServiceIds ?? [];
    } else {
      editing.value = false;
      localForm.first_name = '';
      localForm.last_name = '';
      localForm.email = '';
      localForm.phone = '';
      localForm.color = '#1976D2';
      localForm.service_ids = [];
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
