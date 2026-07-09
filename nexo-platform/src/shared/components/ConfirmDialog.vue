<template>
  <v-dialog
    :model-value="visible"
    max-width="400"
    persistent
    @update:model-value="emit('cancel')"
  >
    <v-card>
      <v-card-title class="text-h6">{{ title }}</v-card-title>
      <v-card-text class="pt-4">{{ message }}</v-card-text>
      <v-card-actions class="pa-4 pt-0">
        <v-spacer />
        <v-btn variant="text" @click="onCancel">Cancelar</v-btn>
        <v-btn color="primary" variant="flat" @click="onConfirm">Confirmar</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
defineProps<{
  visible: boolean;
  title: string;
  message: string;
}>();

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
