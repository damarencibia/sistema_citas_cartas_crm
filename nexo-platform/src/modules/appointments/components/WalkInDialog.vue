<template>
  <v-dialog :model-value="visible" max-width="420" persistent @update:model-value="emit('close')">
    <v-card>
      <v-card-title class="text-h6 d-flex align-center">
        <v-icon start>mdi-walk</v-icon>
        Registrar Walk-in
        <v-spacer />
        <v-btn icon="mdi-close" size="small" variant="text" @click="emit('close')" />
      </v-card-title>
      <v-card-text>
        <v-form ref="formRef" @submit.prevent="onSubmit">
          <v-text-field
            v-model="form.customer_name"
            label="Nombre del cliente *"
            :rules="[(v) => !!v || 'Requerido']"
            class="mb-2"
          />
          <v-text-field
            v-model="form.customer_phone"
            label="Teléfono (opcional)"
            class="mb-2"
          />
          <v-select
            v-model="form.service_id"
            :items="serviceOptions"
            item-title="text"
            item-value="value"
            label="Servicio (opcional)"
            clearable
            class="mb-2"
          />
          <v-select
            v-model="form.employee_id"
            :items="employeeOptions"
            item-title="text"
            item-value="value"
            label="Empleado (opcional)"
            clearable
          />
        </v-form>
      </v-card-text>
      <v-card-actions class="pa-4 pt-0">
        <v-spacer />
        <v-btn variant="text" @click="emit('close')">Cancelar</v-btn>
        <v-btn color="primary" variant="flat" :loading="submitting" @click="onSubmit">
          Agregar a Cola
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { useServiceStore } from '../stores/service.store';
import { useEmployeeStore } from '../stores/employee.store';
import type { CreateWalkInDTO } from '../types/booking.types';

defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  close: [];
  save: [data: CreateWalkInDTO];
}>();

const serviceStore = useServiceStore();
const employeeStore = useEmployeeStore();
const formRef = ref();
const submitting = ref(false);

const form = reactive({
  customer_name: '',
  customer_phone: '',
  service_id: null as string | null,
  employee_id: null as string | null,
});

const serviceOptions = computed(() =>
  serviceStore.activeServices.map((s) => ({
    value: s.id,
    text: `${s.name} (${s.duration_minutes} min)`,
  })),
);

const employeeOptions = computed(() =>
  employeeStore.activeEmployees.map((e) => ({
    value: e.id,
    text: `${e.first_name} ${e.last_name}`,
  })),
);

async function onSubmit() {
  const { valid } = await formRef.value.validate();
  if (!valid) return;
  submitting.value = true;
  emit('save', {
    customer_name: form.customer_name,
    customer_phone: form.customer_phone || undefined,
    service_id: form.service_id || undefined,
    employee_id: form.employee_id || undefined,
  });
  submitting.value = false;
}
</script>
