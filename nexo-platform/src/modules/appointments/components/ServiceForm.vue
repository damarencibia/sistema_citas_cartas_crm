<template>
  <v-dialog
    :model-value="visible"
    max-width="520"
    persistent
    :fullscreen="$vuetify.display.smAndDown"
    @update:model-value="emit('close')"
  >
    <v-card>
      <v-card-title class="text-h6 d-flex align-center">
        {{ editing ? 'Editar Servicio' : 'Nuevo Servicio' }}
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
          <v-text-field
            v-model="localForm.name"
            label="Nombre del servicio"
            :rules="[(v) => !!v || 'Requerido']"
          />
          <v-textarea
            v-model="localForm.description"
            label="Descripción (opcional)"
            rows="2"
          />
          <v-select
            v-model="localForm.category_id"
            :items="categoryOptions"
            item-title="text"
            item-value="value"
            label="Categoría"
            :rules="[(v) => !!v || 'Requerido']"
          />
          <v-select
            v-if="showEmployeeSelect"
            v-model="localForm.employee_id"
            :items="employeeOptions"
            item-title="text"
            item-value="value"
            label="Empleado"
            :rules="[(v) => !!v || 'Requerido']"
          />
          <v-row>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model.number="localForm.duration_minutes"
                label="Duración (min)"
                type="number"
                :rules="[(v) => (v >= 5 && v <= 480) || 'Entre 5 y 480 min']"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model.number="localForm.price"
                label="Precio (centavos)"
                type="number"
                :rules="[(v) => v >= 0 || 'Mínimo 0']"
              />
            </v-col>
          </v-row>
          <v-text-field v-model="localForm.color" label="Color" type="color" />
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
import { ref, reactive, computed, watch, onMounted } from 'vue';
import { useServiceCategoryStore } from '../stores/service-category.store';
import { useEmployeeStore } from '../stores/employee.store';
import { useAuthStore } from '@/shared/stores/auth.store';
import type { Service, CreateServiceDTO } from '../types/service.types';

const props = defineProps<{
  visible: boolean;
  service?: Service | null;
  preselectedEmployeeId?: string;
}>();

const emit = defineEmits<{
  close: [];
  save: [dto: CreateServiceDTO];
}>();

const categoryStore = useServiceCategoryStore();
const employeeStore = useEmployeeStore();
const authStore = useAuthStore();

const editing = ref(false);
const submitting = ref(false);
const formRef = ref();

const showEmployeeSelect = computed(() => authStore.isAdmin);

const localForm = reactive<CreateServiceDTO>({
  name: '',
  description: '',
  duration_minutes: 30,
  price: 0,
  color: '#1976D2',
  category_id: '',
  employee_id: '',
  max_participants: 1,
});

const categoryOptions = computed(() =>
  categoryStore.activeCategories.map((c) => ({
    value: c.id,
    text: c.name,
  })),
);

const employeeOptions = computed(() =>
  employeeStore.activeEmployees.map((e) => ({
    value: e.id,
    text: `${e.first_name} ${e.last_name}`,
  })),
);

watch(
  () => props.service,
  (s) => {
    if (s) {
      editing.value = true;
      localForm.name = s.name;
      localForm.description = s.description ?? '';
      localForm.duration_minutes = s.duration_minutes;
      localForm.price = s.price;
      localForm.color = s.color;
      localForm.category_id = s.category_id;
      localForm.employee_id = s.employee_id ?? '';
      localForm.max_participants = s.max_participants;
    } else {
      editing.value = false;
      localForm.name = '';
      localForm.description = '';
      localForm.duration_minutes = 30;
      localForm.price = 0;
      localForm.color = '#1976D2';
      localForm.category_id = '';
      localForm.employee_id = props.preselectedEmployeeId ?? '';
      localForm.max_participants = 1;
    }
  },
  { immediate: true },
);

onMounted(() => {
  if (!categoryStore.categories.length) categoryStore.fetchCategories();
  if (!employeeStore.employees.length) employeeStore.fetchEmployees();
});

async function onSubmit() {
  const { valid } = await formRef.value.validate();
  if (!valid) return;
  submitting.value = true;
  const payload: CreateServiceDTO = { ...localForm };
  emit('save', payload);
  submitting.value = false;
}
</script>