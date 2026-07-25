<template>
  <v-dialog :model-value="visible" max-width="480" @update:model-value="emit('close')">
    <v-card>
      <v-card-title class="text-h6">
        <v-icon start>mdi-clock-outline</v-icon>
        Unirse a Lista de Espera
      </v-card-title>
      <v-card-text>
        <v-alert type="info" variant="tonal" density="compact" class="mb-4">
          No hay horarios disponibles para esta fecha. Puedes unirte a la lista de espera y te notificaremos cuando se libere un cupo.
        </v-alert>

        <v-form ref="formRef" @submit.prevent="onSubmit">
          <v-text-field
            v-model="form.customer_name"
            label="Nombre completo *"
            :rules="[(v) => !!v || 'Requerido']"
            density="compact"
            class="mb-2"
          />
          <v-text-field
            v-model="form.customer_email"
            label="Email *"
            type="email"
            :rules="emailRules"
            density="compact"
            class="mb-2"
          />
          <v-text-field
            v-model="form.customer_phone"
            label="Teléfono"
            density="compact"
            class="mb-2"
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
          Unirse a la Lista
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';

const props = defineProps<{
  visible: boolean;
  serviceId: string;
  employeeId?: string;
  date: string;
}>();

const emit = defineEmits<{
  close: [];
  save: [data: { customer_name: string; customer_email: string; customer_phone: string }];
}>();

const formRef = ref();
const submitting = ref(false);

const form = reactive({
  customer_name: '',
  customer_email: '',
  customer_phone: '',
});

const emailRules = [
  (v: string) => !!v || 'Requerido',
  (v: string) => v.includes('@') || 'Email inválido',
];

async function onSubmit() {
  const { valid } = await formRef.value.validate();
  if (!valid) return;
  submitting.value = true;
  emit('save', { ...form });
  submitting.value = false;
}
</script>
