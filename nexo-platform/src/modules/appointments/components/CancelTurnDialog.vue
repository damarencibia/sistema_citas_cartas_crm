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

        <template v-if="firstClient && !scheduleStep">
          <div class="text-subtitle-1 font-weight-medium mb-1">
            ¿Asignar este turno al primer cliente de la cola?
          </div>
          <div class="d-flex align-center ga-2 mb-4">
            <v-avatar color="primary" size="32">
              <span class="text-subtitle-2 font-weight-bold">{{ firstClientInitials }}</span>
            </v-avatar>
            <div class="text-body-1 font-weight-medium text-truncate">
              {{ firstClient.customer_name }}
            </div>
            <v-chip
              size="small"
              variant="tonal"
              color="primary"
              prepend-icon="mdi-account-clock-outline"
            >
              Posición {{ firstClient.position }}
            </v-chip>
          </div>
        </template>

        <template v-else>
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
        </template>
      </v-card-text>
      <v-card-actions class="pa-4 pt-0">
        <v-spacer />
        <template v-if="firstClient && !scheduleStep">
          <v-btn variant="text" @click="emit('close')">Volver</v-btn>
          <v-btn variant="tonal" @click="scheduleStep = true">No</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :loading="loading"
            prepend-icon="mdi-account-switch-outline"
            @click="onAssign"
          >
            Sí, asignar
          </v-btn>
        </template>
        <template v-else>
          <v-btn variant="text" @click="emit('close')">Volver</v-btn>
          <v-btn
            color="error"
            variant="flat"
            :loading="loading"
            @click="onConfirm"
          >
            Cancelar turno
          </v-btn>
        </template>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { Booking, WaitlistEntry } from '../types/booking.types';

const props = defineProps<{
  visible: boolean;
  booking: Booking | null;
  waitlistEntries?: WaitlistEntry[];
}>();

const emit = defineEmits<{
  close: [];
  confirm: [data: { assign: boolean; keepBlocked: boolean; reason: string }];
}>();

const loading = ref(false);
const keepBlocked = ref(false);
const reason = ref('');
const scheduleStep = ref(false);

const firstClient = computed<WaitlistEntry | null>(() => {
  const active = (props.waitlistEntries ?? []).filter(
    (e) => e.status === 'waiting' || e.status === 'notified',
  );
  const sorted = [...active].sort(
    (a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at),
  );
  return sorted[0] ?? null;
});

const firstClientInitials = computed(() => {
  const name = firstClient.value?.customer_name || '?';
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
});

watch(
  () => props.visible,
  (v) => {
    if (v) {
      keepBlocked.value = false;
      reason.value = '';
      scheduleStep.value = false;
    }
  },
);

function onAssign() {
  emit('confirm', {
    assign: true,
    keepBlocked: false,
    reason: reason.value,
  });
}

function onConfirm() {
  emit('confirm', {
    assign: false,
    keepBlocked: keepBlocked.value,
    reason: reason.value,
  });
}
</script>
