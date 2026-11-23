<template>
  <v-dialog
    :model-value="visible"
    :max-width="maxWidth"
    persistent
    @update:model-value="emit('cancel')"
  >
    <v-card class="confirm-dialog">
      <div class="confirm-dialog__body">
        <div
          class="confirm-dialog__icon"
          :class="{ 'confirm-dialog__icon--danger': danger }"
        >
          <v-icon size="22">{{ danger ? 'mdi-alert-circle-outline' : 'mdi-help-circle-outline' }}</v-icon>
        </div>
        <div class="confirm-dialog__titles">
          <div class="confirm-dialog__title">{{ title }}</div>
          <p class="confirm-dialog__message">{{ message }}</p>
        </div>
      </div>
      <v-card-actions class="confirm-dialog__actions">
        <v-spacer />
        <v-btn variant="text" @click="onCancel">{{ cancelText }}</v-btn>
        <v-btn
          :color="danger ? 'error' : 'primary'"
          variant="flat"
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

<style scoped>
.confirm-dialog__body {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 24px 24px 8px;
}

.confirm-dialog__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background-color: rgba(var(--v-theme-primary), 0.1);
  color: rgb(var(--v-theme-primary));
}

.confirm-dialog__icon--danger {
  background-color: rgba(var(--v-theme-error), 0.1);
  color: rgb(var(--v-theme-error));
}

.confirm-dialog__titles {
  min-width: 0;
  padding-top: 2px;
}

.confirm-dialog__title {
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--text-primary);
}

.confirm-dialog__message {
  margin-top: 4px;
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-muted);
}

.confirm-dialog__actions {
  gap: 4px;
  padding: 16px 20px 20px;
}
</style>
