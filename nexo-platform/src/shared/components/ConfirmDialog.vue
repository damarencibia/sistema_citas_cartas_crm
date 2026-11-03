<template>
  <v-dialog
    :model-value="visible"
    :max-width="maxWidth"
    persistent
    @update:model-value="emit('cancel')"
  >
    <v-card>
      <v-card-title class="text-h6 d-flex align-start ga-3">
        <v-icon
          v-if="danger"
          color="error"
          size="24"
          class="mt-1"
        >
          mdi-alert-circle-outline
        </v-icon>
        {{ title }}
      </v-card-title>
      <v-card-text class="pt-4">{{ message }}</v-card-text>
      <v-card-actions class="pa-4 pt-0">
        <v-spacer />
        <v-btn variant="text" @click="onCancel">{{ cancelText }}</v-btn>
        <v-btn
          :color="danger ? 'error' : 'primary'"
          :variant="danger ? 'flat' : 'flat'"
          :loading="loading"
          @click="onConfirm"
        >
          {{ confirmText }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    visible: boolean;
    title: string;
    message: string;
    /** Acción destructiva: icono + botón de confirmación en rojo */
    danger?: boolean;
    /** Deshabilita el diálogo mientras corre la acción (evita doble submit) */
    loading?: boolean;
    confirmText?: string;
    cancelText?: string;
    maxWidth?: string | number;
  }>(),
  {
    danger: false,
    loading: false,
    confirmText: 'Confirmar',
    cancelText: 'Cancelar',
    maxWidth: 440,
  },
);

const emit = defineEmits<{
  confirm: [];
  cancel: [];
}>();

function onConfirm() {
  emit('confirm');
}
function onCancel() {
  emit('cancel');
}
</script>
