<template>
  <v-dialog :model-value="visible" max-width="440" @update:model-value="emit('close')">
    <v-card>
      <v-card-title class="text-h6 d-flex align-center">
        <v-icon color="error" class="mr-2">mdi-calendar-remove</v-icon>
        Cancelar turno
      </v-card-title>
      <v-card-text>
        <div v-if="booking" class="text-body-2 text-medium-emphasis mb-4">
          {{ booking.customer_name || 'Sin nombre' }} — {{ booking.service?.name }}
          <br>
          {{ booking.date }} {{ booking.start_time?.slice(0, 5) }} - {{ booking.end_time?.slice(0, 5) }}
        </div>

        <div class="text-subtitle-2 mb-2">¿Qué hacer con el horario?</div>
        <v-radio-group v-model="keepBlocked" density="compact" hide-details>
          <v-radio label="Marcar disponible" :value="false" />
          <v-radio label="Mantener ocupado (en rojo)" :value="true" />
        </v-radio-group>
        <v-textarea
          v-model="reason"
          label="Motivo de cancelación (opcional)"
          rows="2"
          density="compact"
          class="mt-3"
        />
      </v-card-text>
      <v-card-actions class="pa-4 pt-0">
        <v-spacer />
        <v-btn variant="text" @click="emit('close')">Volver</v-btn>
        <v-btn
          color="error"
          variant="flat"
          :loading="loading"
          @click="onConfirm"
        >
          Cancelar turno
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import type { Booking } from '../types/booking.types';

const props = defineProps<{
  visible: boolean;
  booking: Booking | null;
}>();

const emit = defineEmits<{
  close: [];
  confirm: [data: { keepBlocked: boolean; reason: string }];
}>();

const loading = ref(false);
const keepBlocked = ref(false);
const reason = ref('');

watch(
  () => props.visible,
  (v) => {
    if (v) {
      keepBlocked.value = false;
      reason.value = '';
    }
  },
);

function onConfirm() {
  emit('confirm', {
    keepBlocked: keepBlocked.value,
    reason: reason.value,
  });
}
</script>
