<template>
  <v-dialog :model-value="visible" max-width="440" @update:model-value="emit('close')">
    <v-card>
      <v-card-title class="text-h6 d-flex align-center">
        <v-icon color="error" class="mr-2">mdi-cancel</v-icon>
        Cancelar Cita
      </v-card-title>
      <v-card-text>
        <div v-if="booking" class="text-body-2 text-medium-emphasis mb-4">
          {{ booking.customer_name }} — {{ booking.date }} {{ booking.start_time?.slice(0, 5) }}
        </div>

        <v-textarea
          v-model="reason"
          label="Motivo de cancelación (opcional)"
          rows="2"
          density="compact"
          class="mb-4"
        />

        <div class="text-subtitle-2 mb-2">Acción sobre el cliente</div>
        <v-radio-group v-model="blockOption" density="compact" hide-details>
          <v-radio label="No bloquear" value="none" />
          <v-radio value="temporary">
            <template #label>
              <div class="d-flex align-center ga-2">
                <span>Bloquear temporalmente</span>
                <v-text-field
                  v-if="blockOption === 'temporary'"
                  v-model.number="blockDays"
                  type="number"
                  min="1"
                  max="365"
                  density="compact"
                  hide-details
                  suffix="días"
                  style="max-width: 120px"
                  class="ml-2"
                />
              </div>
            </template>
          </v-radio>
          <v-radio label="Bloquear indefinidamente" value="indefinite" />
        </v-radio-group>
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
          Cancelar Cita
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
  confirm: [data: { reason: string; blockOption: 'none' | 'temporary' | 'indefinite'; blockDays: number }];
}>();

const loading = ref(false);
const reason = ref('');
const blockOption = ref<'none' | 'temporary' | 'indefinite'>('none');
const blockDays = ref(30);

watch(
  () => props.visible,
  (v) => {
    if (v) {
      reason.value = '';
      blockOption.value = 'none';
      blockDays.value = 30;
    }
  },
);

function onConfirm() {
  emit('confirm', {
    reason: reason.value,
    blockOption: blockOption.value,
    blockDays: blockDays.value,
  });
}
</script>
