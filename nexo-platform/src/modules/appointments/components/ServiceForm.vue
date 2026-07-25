<template>
  <v-dialog
    :model-value="visible"
    max-width="520"
    persistent
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
            class="mb-2"
          />
          <v-textarea
            v-model="localForm.description"
            label="Descripción (opcional)"
            rows="2"
            class="mb-2"
          />
          <v-row>
            <v-col cols="6">
              <v-text-field
                v-model.number="localForm.duration_minutes"
                label="Duración (min)"
                type="number"
                :rules="[(v) => (v >= 5 && v <= 480) || 'Entre 5 y 480 min']"
              />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model.number="localForm.price"
                label="Precio (centavos)"
                type="number"
                :rules="[(v) => v >= 0 || 'Mínimo 0']"
              />
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="6">
              <v-text-field v-model="localForm.category" label="Categoría (opcional)" />
            </v-col>
            <v-col cols="6">
              <v-text-field v-model="localForm.color" label="Color" type="color" />
            </v-col>
          </v-row>
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
import { ref, reactive, watch } from 'vue';
import type { Service, CreateServiceDTO } from '../types/service.types';

const props = defineProps<{
  visible: boolean;
  service?: Service | null;
}>();

const emit = defineEmits<{
  close: [];
  save: [dto: CreateServiceDTO];
}>();

const editing = ref(false);
const submitting = ref(false);
const formRef = ref();

const localForm = reactive<CreateServiceDTO>({
  name: '',
  description: '',
  duration_minutes: 30,
  price: 0,
  color: '#1976D2',
  category: '',
});

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
      localForm.category = s.category ?? '';
    } else {
      editing.value = false;
      localForm.name = '';
      localForm.description = '';
      localForm.duration_minutes = 30;
      localForm.price = 0;
      localForm.color = '#1976D2';
      localForm.category = '';
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
