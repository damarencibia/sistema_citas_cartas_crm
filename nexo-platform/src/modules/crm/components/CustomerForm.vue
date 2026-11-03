<template>
  <v-dialog
    :model-value="visible"
    :fullscreen="smAndDown"
    :max-width="560"
    persistent
    scrollable
    @update:model-value="emit('close')"
  >
    <v-card :loading="loading">
      <v-card-title class="d-flex align-center pa-4">
        <v-btn
          v-if="smAndDown"
          icon
          variant="text"
          density="compact"
          class="mr-2"
          @click="emit('close')"
        >
          <v-icon>mdi-arrow-left</v-icon>
        </v-btn>
        <span class="text-h6 font-weight-medium">
          {{ isEditing ? 'Editar Cliente' : 'Nuevo Cliente' }}
        </span>
      </v-card-title>
      <v-divider />

      <v-card-text class="pa-4">
        <v-form v-model="isValid" fast-fail @submit.prevent>
          <v-row>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="form.firstName"
                label="Nombre *"
                autocomplete="given-name"
                :rules="[rules.required]"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="form.lastName"
                label="Apellido *"
                autocomplete="family-name"
                :rules="[rules.required]"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="form.phone"
                label="Teléfono"
                autocomplete="tel"
                :rules="[rules.optionalPhone]"
                hint="Formato internacional: +54 9 11 1234-5678"
                persistent-hint
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="form.email"
                label="Email"
                autocomplete="email"
                :rules="[rules.optionalEmail]"
              />
            </v-col>
            <v-col cols="12">
              <v-textarea
                v-model="form.notes"
                label="Notas internas"
                placeholder="Preferencias, alergias, historial relevante…"
                auto-grow
                rows="2"
                counter="500"
                maxlength="500"
              />
            </v-col>
          </v-row>
        </v-form>
      </v-card-text>

      <v-divider />
      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="text" @click="emit('close')">Cancelar</v-btn>
        <v-btn
          color="primary"
          :loading="loading"
          :disabled="!isValid"
          @click="save"
        >
          {{ isEditing ? 'Guardar Cambios' : 'Crear Cliente' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import { useDisplay } from 'vuetify';
import type { CreateCustomerDTO, Customer } from '../types/customer.types';

const props = defineProps<{
  visible: boolean;
  /** Cliente a editar; null → modo creación */
  customer?: Customer | null;
  /** Estado de guardado controlado por la vista (evita doble submit) */
  loading?: boolean;
}>();

const emit = defineEmits<{
  close: [];
  save: [dto: CreateCustomerDTO];
}>();

const { smAndDown } = useDisplay();
const isValid = ref(false);

interface CustomerFormModel {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  notes: string;
}

const emptyForm = (): CustomerFormModel => ({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  notes: '',
});

const form = reactive<CustomerFormModel>(emptyForm());
const isEditing = ref(false);

watch(
  () => [props.visible, props.customer] as const,
  ([visible, customer]) => {
    if (!visible) return;
    isEditing.value = !!customer;
    Object.assign(form, emptyForm(), {
      firstName: customer?.first_name ?? '',
      lastName: customer?.last_name ?? '',
      email: customer?.email ?? '',
      phone: customer?.phone ?? '',
      notes: customer?.notes ?? '',
    });
  },
  { immediate: true },
);

const rules = {
  required: (v: string) => !!v?.trim() || 'Este campo es obligatorio',
  optionalEmail: (v: string) => !v?.trim() || /.+@.+\..+/.test(v) || 'Email inválido',
  optionalPhone: (v: string) =>
    !v?.trim() || /^[+\d\s()-]{6,20}$/.test(v.trim()) || 'Teléfono inválido',
};

function save() {
  emit('save', {
    first_name: form.firstName.trim(),
    last_name: form.lastName.trim(),
    email: form.email.trim(),
    phone: form.phone.trim(),
    notes: form.notes.trim(),
  });
}
</script>
