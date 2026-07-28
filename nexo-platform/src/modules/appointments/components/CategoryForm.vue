<template>
  <v-dialog
    :model-value="visible"
    max-width="520"
    persistent
    @update:model-value="emit('close')"
  >
    <v-card>
      <v-card-title class="text-h6 d-flex align-center">
        {{ editing ? 'Editar Categoría' : 'Nueva Categoría' }}
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
            label="Nombre de la categoría"
            :rules="[(v) => !!v || 'Requerido']"
          />
          <v-textarea
            v-model="localForm.description"
            label="Descripción (opcional)"
            rows="2"
          />
          <v-select
            v-model="localForm.icon"
            :items="iconOptions"
            label="Icono"
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
import { ref, reactive, watch } from 'vue';
import type { ServiceCategory, CreateServiceCategoryDTO } from '../types/service-category.types';

const props = defineProps<{
  visible: boolean;
  category?: ServiceCategory | null;
}>();

const emit = defineEmits<{
  close: [];
  save: [dto: CreateServiceCategoryDTO];
}>();

const editing = ref(false);
const submitting = ref(false);
const formRef = ref();

const localForm = reactive<CreateServiceCategoryDTO>({
  name: '',
  description: '',
  icon: 'mdi-tag-outline',
});

const iconOptions = [
  { title: 'Etiqueta', value: 'mdi-tag-outline' },
  { title: 'Estrella', value: 'mdi-star-outline' },
  { title: 'Tijeras', value: 'mdi-content-cut' },
  { title: 'Peine', value: 'mdi-comb' },
  { title: 'Gotas', value: 'mdi-water' },
  { title: 'Mano', value: 'mdi-hand-back-right-outline' },
  { title: 'Rostro', value: 'mdi-face-man-outline' },
  { title: 'Cepillo', value: 'mdi-brush' },
  { title: 'Sparkles', value: 'mdi-sparkles' },
];

watch(
  () => props.category,
  (c) => {
    if (c) {
      editing.value = true;
      localForm.name = c.name;
      localForm.description = c.description ?? '';
      localForm.icon = c.icon || 'mdi-tag-outline';
    } else {
      editing.value = false;
      localForm.name = '';
      localForm.description = '';
      localForm.icon = 'mdi-tag-outline';
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
