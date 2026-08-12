<template>
  <v-dialog
    :model-value="visible"
    max-width="520"
    :fullscreen="$vuetify.display.smAndDown"
    @update:model-value="emit('close')"
  >
    <v-card v-if="booking">
      <v-card-title class="pb-2">
        <div class="d-flex align-start ga-2">
          <div class="flex-grow-1" style="min-width: 0">
            <div class="text-h6 text-truncate">{{ booking.customer_name || 'Sin nombre' }}</div>
            <div class="text-caption text-medium-emphasis text-truncate">
              {{ booking.service?.name || 'Servicio' }}
            </div>
          </div>
          <v-btn
            icon="mdi-close"
            size="small"
            variant="text"
            aria-label="Cerrar"
            @click="emit('close')"
          />
        </div>
        <div class="d-flex flex-wrap ga-1 mt-2">
          <BookingStatusChip :status="booking.status" />
          <v-chip size="small" variant="tonal" :color="sourceConfig.color">
            {{ sourceConfig.label }}
          </v-chip>
          <v-chip
            size="small"
            variant="tonal"
            prepend-icon="mdi-calendar"
          >
            {{ booking.date }} · {{ booking.start_time?.slice(0, 5) }} - {{ booking.end_time?.slice(0, 5) }}
          </v-chip>
        </div>
      </v-card-title>
      <v-card-text>
        <v-list density="compact">
          <v-list-item prepend-icon="mdi-phone" :title="booking.customer_phone || 'Sin teléfono'" />
          <v-list-item prepend-icon="mdi-email" :title="booking.customer_email || 'Sin email'" />
          <v-list-item
            v-if="booking.employee"
            prepend-icon="mdi-account-tie"
            :title="`${booking.employee.first_name} ${booking.employee.last_name}`"
          />
          <v-list-item
            v-if="booking.participant_count > 1"
            prepend-icon="mdi-account-group"
            :title="`${booking.participant_count} participantes`"
          />
          <v-list-item v-if="booking.notes" prepend-icon="mdi-note-text" :title="booking.notes" />
        </v-list>

        <div v-if="statusLog.length" class="mt-2">
          <div class="text-subtitle-2 font-weight-bold mb-1">
            <v-icon size="small" class="mr-1">mdi-history</v-icon>
            Historial de estados
          </div>
          <v-list density="compact" class="bg-transparent">
            <v-list-item v-for="entry in statusLog" :key="entry.id" class="px-0">
              <template #prepend>
                <v-icon size="small" :icon="statusMeta(entry.new_status).icon" :color="statusMeta(entry.new_status).color" />
              </template>
              <v-list-item-title class="text-body-2">
                {{ statusMeta(entry.old_status).label }} → {{ statusMeta(entry.new_status).label }}
              </v-list-item-title>
              <v-list-item-subtitle class="text-caption">
                {{ formatDate(entry.created_at) }} · {{ entry.changed_by_name || entry.changed_by }}
                <span v-if="entry.reason"> · {{ entry.reason }}</span>
              </v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </div>
      </v-card-text>

      <v-card-text v-if="hasPhone || hasWhatsapp" class="pt-0">
        <div class="d-flex ga-2" :class="xs ? 'flex-column' : 'flex-row'">
          <v-btn
            v-if="hasWhatsapp"
            color="green"
            variant="tonal"
            block
            prepend-icon="mdi-whatsapp"
            :href="whatsappUrl"
            target="_blank"
            rel="noopener"
          >
            WhatsApp
          </v-btn>
          <v-btn
            v-if="hasPhone"
            color="teal"
            variant="tonal"
            block
            prepend-icon="mdi-phone"
            :href="telUrl"
          >
            Llamar
          </v-btn>
        </div>
      </v-card-text>
      <v-card-actions v-if="showActions && canUpdate" class="pa-4 pt-0 d-flex flex-column align-stretch ga-2">
        <v-btn
          v-if="booking.status === 'pending_confirmation'"
          color="success"
          variant="flat"
          block
          prepend-icon="mdi-check-circle"
          @click="emit('statusChange', booking, 'confirmed')"
        >
          Confirmar
        </v-btn>
        <div class="d-flex ga-2 flex-wrap">
          <v-btn
            v-if="booking.status === 'confirmed'"
            color="primary"
            variant="tonal"
            prepend-icon="mdi-calendar-switch"
            :class="{ 'flex-grow-1': smAndDown }"
            @click="showReassignDialog = true"
          >
            Reasignar
          </v-btn>
          <v-btn
            v-if="booking.status === 'confirmed' || booking.status === 'in_progress'"
            color="error"
            variant="outlined"
            prepend-icon="mdi-cancel"
            :class="{ 'flex-grow-1': smAndDown }"
            @click="showCancelDialog = true"
          >
            Cancelar
          </v-btn>
        </div>
        <div class="d-flex justify-end ga-1 flex-wrap">
          <v-btn
            color="primary"
            variant="text"
            size="small"
            prepend-icon="mdi-pencil"
            @click="emit('edit', booking)"
          >
            Editar
          </v-btn>
          <v-btn
            color="error"
            variant="text"
            size="small"
            prepend-icon="mdi-delete-forever"
            @click="showDeleteDialog = true"
          >
            Eliminar
          </v-btn>
        </div>
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
import { ref, computed, watch } from 'vue';
import { useDisplay } from 'vuetify';
import { useAuthStore } from '@/shared/stores/auth.store';
import { bookingRepository } from '../repositories/booking.repository';
import BookingStatusChip from './BookingStatusChip.vue';
import CancelBookingDialog from './CancelBookingDialog.vue';
import ReassignBookingDialog from './ReassignBookingDialog.vue';
import type { Booking, BookingSource, BookingStatus, BookingStatusLog } from '../types/booking.types';

const props = defineProps<{
  visible: boolean;
  booking: Booking | null;
  showActions?: boolean;
}>();

const emit = defineEmits<{
  close: [];
  statusChange: [booking: Booking, status: string];
  cancel: [
    booking: Booking,
    reason: string,
    blockOption: 'none' | 'temporary' | 'indefinite',
    blockDays: number,
  ];
  reassign: [booking: Booking, newDate: string, newStartTime: string];
  delete: [booking: Booking];
  edit: [booking: Booking];
}>();

const authStore = useAuthStore();
const { xs, smAndDown } = useDisplay();
const showCancelDialog = ref(false);
const showReassignDialog = ref(false);
const showDeleteDialog = ref(false);
const deleting = ref(false);
const statusLog = ref<BookingStatusLog[]>([]);

const canUpdate = computed(() =>
  ['owner', 'admin', 'employee', 'super_admin'].includes(authStore.userRole ?? ''),
);

const sourceMap: Record<BookingSource, { label: string; color: string }> = {
  online: { label: 'Portal', color: 'info' },
  manual: { label: 'Manual', color: 'grey' },
  phone: { label: 'Teléfono', color: 'teal' },
  walk_in: { label: 'Walk-in', color: 'orange' },
};

const statusMetaMap: Record<BookingStatus, { label: string; color: string; icon: string }> = {
  confirmed: { label: 'Confirmada', color: 'info', icon: 'mdi-check-circle' },
  in_progress: { label: 'En Progreso', color: 'warning', icon: 'mdi-progress-clock' },
  completed: { label: 'Completada', color: 'success', icon: 'mdi-check-all' },
  no_show: { label: 'No Asistió', color: 'error', icon: 'mdi-cancel' },
  cancelled: { label: 'Cancelada', color: 'grey', icon: 'mdi-close-circle' },
  pending_approval: { label: 'Pendiente Aprobación', color: 'amber', icon: 'mdi-clock-alert' },
  pending_confirmation: { label: 'Pendiente Confirmación', color: 'orange', icon: 'mdi-message-clock-outline' },
};

function statusMeta(status: string | null): { label: string; color: string; icon: string } {
  if (!status) return { label: '—', color: 'grey', icon: 'mdi-circle-outline' };
  return statusMetaMap[status as BookingStatus] ?? { label: status, color: 'grey', icon: 'mdi-help' };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const sourceConfig = computed(() => sourceMap[props.booking?.source ?? 'manual'] ?? sourceMap.manual);

const whatsappUrl = computed<string | undefined>(() => {
  if (!props.booking?.whatsapp_consent) return undefined;
  const phone = props.booking.customer_phone;
  if (!phone) return undefined;
  const digits = phone.replace(/\D/g, '');
  if (!digits) return undefined;
  const service = props.booking.service?.name ?? '';
  const date = props.booking.date;
  const time = props.booking.start_time?.slice(0, 5) ?? '';
  const text = `Hola ${props.booking.customer_name ?? ''}, te escribo respecto a tu cita${service ? ` de ${service}` : ''} del ${date}${time ? ` a las ${time}` : ''}.`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
});

const telUrl = computed<string | undefined>(() => {
  const digits = props.booking?.customer_phone?.replace(/\D/g, '');
  return digits ? `tel:${digits}` : undefined;
});

const hasWhatsapp = computed(() => !!whatsappUrl.value);
const hasPhone = computed(() => !!telUrl.value);

watch(
  () => [props.visible, props.booking?.id] as const,
  async ([visible, bookingId]) => {
    if (visible && bookingId) {
      try {
        statusLog.value = await bookingRepository.getStatusLogByBooking(bookingId);
      } catch {
        statusLog.value = [];
      }
    } else {
      statusLog.value = [];
    }
  },
);

function onCancelConfirm(data: {
  reason: string;
  blockOption: 'none' | 'temporary' | 'indefinite';
  blockDays: number;
}) {
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
