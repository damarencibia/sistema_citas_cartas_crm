<template>
  <v-dialog :model-value="visible" max-width="480" @update:model-value="emit('close')">
    <v-card v-if="booking">
      <v-card-title class="text-h6 d-flex align-center">
        Detalle de Cita
        <v-spacer />
        <BookingStatusChip :status="booking.status" />
      </v-card-title>
      <v-card-text>
        <v-list density="compact">
          <v-list-item prepend-icon="mdi-account" :title="booking.customer_name || 'Sin nombre'" />
          <v-list-item prepend-icon="mdi-phone" :title="booking.customer_phone || 'Sin teléfono'" />
          <v-list-item prepend-icon="mdi-email" :title="booking.customer_email || 'Sin email'" />
          <v-list-item prepend-icon="mdi-calendar" :title="booking.date" />
          <v-list-item
            prepend-icon="mdi-clock-outline"
            :title="`${booking.start_time?.slice(0, 5)} - ${booking.end_time?.slice(0, 5)}`"
          />
          <v-list-item prepend-icon="mdi-tag" :title="booking.service?.name || 'Servicio'" />
          <v-list-item
            v-if="booking.employee"
            prepend-icon="mdi-account-tie"
            :title="`${booking.employee.first_name} ${booking.employee.last_name}`"
          />
          <v-list-item v-if="booking.notes" prepend-icon="mdi-note-text" :title="booking.notes" />
          <v-list-item v-if="booking.source === 'walk_in'" prepend-icon="mdi-walk">
            <v-chip size="x-small" color="teal" variant="tonal">Walk-in</v-chip>
          </v-list-item>
        </v-list>
      </v-card-text>
      <v-card-actions v-if="showActions && canUpdate" class="pa-4 pt-0">
        <v-btn
          v-if="booking.status === 'confirmed' || booking.status === 'in_progress'"
          color="success"
          variant="flat"
          prepend-icon="mdi-check-all"
          @click="emit('statusChange', booking, 'completed')"
        >
          Completar
        </v-btn>
        <v-btn
          v-if="booking.status === 'confirmed' || booking.status === 'in_progress'"
          color="error"
          variant="outlined"
          prepend-icon="mdi-cancel"
          @click="showCancelDialog = true"
        >
          Cancelar
        </v-btn>
        <v-btn
          v-if="booking.status === 'confirmed'"
          color="primary"
          variant="tonal"
          prepend-icon="mdi-calendar-switch"
          @click="showReassignDialog = true"
        >
          Reasignar
        </v-btn>
        <v-spacer />
        <v-btn
          color="error"
          variant="text"
          prepend-icon="mdi-delete-forever"
          size="small"
          @click="showDeleteDialog = true"
        >
          Eliminar
        </v-btn>
        <v-btn variant="text" @click="emit('close')">Cerrar</v-btn>
      </v-card-actions>
    </v-card>

    <CancelBookingDialog
      :visible="showCancelDialog"
      :booking="booking"
      @close="showCancelDialog = false"
      @confirm="onCancelConfirm"
    />

    <ReassignBookingDialog
      :visible="showReassignDialog"
      :booking="booking"
      @close="showReassignDialog = false"
      @confirm="onReassignConfirm"
    />

    <v-dialog v-model="showDeleteDialog" max-width="400" persistent>
      <v-card>
        <v-card-title class="text-h6 text-error">
          <v-icon start color="error">mdi-alert-circle</v-icon>
          Eliminar cita permanentemente
        </v-card-title>
        <v-card-text>
          ¿Estás seguro de eliminar permanentemente esta cita?
          <br><br>
          <strong>Esta acción no se puede deshacer.</strong>
          <div class="mt-3 text-body-2">
            Cliente: {{ booking?.customer_name }}<br>
            Fecha: {{ booking?.date }} - {{ booking?.start_time?.slice(0, 5) }}
          </div>
        </v-card-text>
        <v-card-actions class="pa-4 pt-0">
          <v-spacer />
          <v-btn variant="text" @click="showDeleteDialog = false">Cancelar</v-btn>
          <v-btn
            color="error"
            variant="flat"
            prepend-icon="mdi-delete-forever"
            :loading="deleting"
            @click="onDeleteConfirm"
          >
            Eliminar permanentemente
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAuthStore } from '@/shared/stores/auth.store';
import BookingStatusChip from './BookingStatusChip.vue';
import CancelBookingDialog from './CancelBookingDialog.vue';
import ReassignBookingDialog from './ReassignBookingDialog.vue';
import type { Booking } from '../types/booking.types';

const props = defineProps<{
  visible: boolean;
  booking: Booking | null;
  showActions?: boolean;
}>();

const emit = defineEmits<{
  close: [];
  statusChange: [booking: Booking, status: string];
  cancel: [booking: Booking, reason: string, blockOption: 'none' | 'temporary' | 'indefinite', blockDays: number];
  reassign: [booking: Booking, newDate: string, newStartTime: string];
  delete: [booking: Booking];
}>();

const authStore = useAuthStore();
const showCancelDialog = ref(false);
const showReassignDialog = ref(false);
const showDeleteDialog = ref(false);
const deleting = ref(false);

const canUpdate = computed(() =>
  ['owner', 'admin', 'employee', 'super_admin'].includes(authStore.userRole ?? ''),
);

function onCancelConfirm(data: { reason: string; blockOption: 'none' | 'temporary' | 'indefinite'; blockDays: number }) {
  if (!props.booking) return;
  emit('cancel', props.booking, data.reason, data.blockOption, data.blockDays);
  showCancelDialog.value = false;
}

function onReassignConfirm(data: { newDate: string; newStartTime: string }) {
  if (!props.booking) return;
  emit('reassign', props.booking, data.newDate, data.newStartTime);
  showReassignDialog.value = false;
}

async function onDeleteConfirm() {
  if (!props.booking) return;
  deleting.value = true;
  emit('delete', props.booking);
  showDeleteDialog.value = false;
  deleting.value = false;
}
</script>
