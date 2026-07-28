<template>
  <v-dialog :model-value="visible" max-width="480" @update:model-value="emit('close')">
    <v-card>
      <v-card-title class="text-h6">
        <v-icon start>mdi-clock-outline</v-icon>
        Unirse a Lista de Espera
      </v-card-title>
      <v-card-text>
        <v-alert
          v-if="preselectedTime"
          type="info"
          variant="tonal"
          density="compact"
          class="mb-4"
        >
          El horario de las <strong>{{ preselectedTime.slice(0,5) }}</strong> está ocupado. Únete a la lista y te notificaremos si se libera.
        </v-alert>
        <v-alert
          v-else
          type="info"
          variant="tonal"
          density="compact"
          class="mb-4"
        >
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
          <div class="text-body-2 text-medium-emphasis mb-1">Preferencia</div>
          <v-btn-toggle
            v-model="form.preference"
            mandatory
            density="compact"
            class="mb-2"
            color="primary"
            variant="outlined"
          >
            <v-btn value="exact" size="small">Horario exacto</v-btn>
            <v-btn value="flexible" size="small">Cualquier hora</v-btn>
          </v-btn-toggle>
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
import { ref, reactive, onMounted } from 'vue';

const props = defineProps<{
  visible: boolean;
  serviceId: string;
  employeeId?: string;
  date: string;
  preselectedTime?: string;
  preselectedPreference?: 'exact' | 'flexible';
}>();

const emit = defineEmits<{
  close: [];
  save: [data: { customer_name: string; customer_email: string; customer_phone: string; preference: 'exact' | 'flexible'; time?: string }];
}>();

const formRef = ref();
const submitting = ref(false);

const form = reactive({
  customer_name: '',
  customer_email: '',
  customer_phone: '',
  preference: 'exact' as 'exact' | 'flexible',
});

const emailRules = [
  (v: string) => !!v || 'Requerido',
  (v: string) => v.includes('@') || 'Email inválido',
];

onMounted(() => {
  if (props.preselectedPreference) {
    form.preference = props.preselectedPreference;
  }
});

async function onSubmit() {
  const { valid } = await formRef.value.validate();
  if (!valid) return;
  submitting.value = true;
  emit('save', { ...form, time: props.preselectedTime });
  submitting.value = false;
}
</script>
