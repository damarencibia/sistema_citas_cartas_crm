<template>
  <div class="h-100 flex-grow-1 overflow-y-auto pa-4 d-flex flex-column ga-3">
    <div class="d-flex align-center ga-2">
      <v-icon size="small" color="primary">mdi-information-outline</v-icon>
      <span class="text-subtitle-2 font-weight-bold">Detalle de la cita</span>
      <v-chip
        v-if="booking.status"
        size="x-small"
        :color="statusColor"
        variant="tonal"
        label
      >
        {{ statusLabel }}
      </v-chip>
    </div>

    <v-row dense>
      <v-col cols="12" sm="6" md="6">
        <v-card variant="outlined" rounded="lg" class="h-100">
          <div class="pa-4 d-flex flex-column ga-3">
            <div class="section-title">
              <v-icon size="small" class="mr-1">mdi-account-circle-outline</v-icon>
              Cliente
            </div>
            <div class="d-flex align-center ga-3">
              <v-icon color="primary" size="32">mdi-account</v-icon>
              <div class="flex-grow-1" style="min-width: 0">
                <div class="text-subtitle-2 text-truncate">{{ booking.customer_name || 'Sin nombre' }}</div>
                <div
                  v-if="booking.participant_count > 1"
                  class="text-caption text-medium-emphasis"
                >
                  {{ booking.participant_count }} participantes
                </div>
              </div>
            </div>
            <v-divider />
            <div class="d-flex flex-column ga-2">
              <div class="d-flex align-center ga-2">
                <v-icon size="small" color="medium-emphasis">mdi-phone</v-icon>
                <span class="text-body-2">{{ booking.customer_phone || 'Sin teléfono' }}</span>
              </div>
              <div class="d-flex align-center ga-2">
                <v-icon size="small" color="medium-emphasis">mdi-email</v-icon>
                <span class="text-body-2">{{ booking.customer_email || 'Sin email' }}</span>
              </div>
            </div>
            <div class="d-flex flex-column ga-2">
              <v-btn
                v-if="hasWhatsapp"
                color="green"
                variant="outlined"
                block
                prepend-icon="mdi-whatsapp"
                :href="whatsappUrl"
                target="_blank"
                rel="noopener"
              >
                WhatsApp
              </v-btn>
              <v-btn
                v-if="hasPhone && xs"
                color="teal"
                variant="outlined"
                block
                prepend-icon="mdi-phone"
                :href="telUrl"
              >
                Llamar
              </v-btn>
              <v-btn
                v-if="booking.customer_email"
                variant="outlined"
                block
                prepend-icon="mdi-email-outline"
                :href="`mailto:${booking.customer_email}`"
              >
                Correo
              </v-btn>
            </div>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="6">
        <v-card variant="outlined" rounded="lg" class="h-100">
          <div class="pa-3 d-flex flex-column ga-2">
            <div class="section-title">
              <v-icon size="small" class="mr-1">mdi-calendar-cursor</v-icon>
              Cita
            </div>
            <div class="d-flex flex-column ga-1">
              <div class="d-flex align-center ga-2">
                <v-icon size="small" color="medium-emphasis">mdi-calendar</v-icon>
                <span class="text-body-2">{{ dateLine }}</span>
              </div>
              <div class="d-flex align-center ga-2">
                <v-icon size="small" color="medium-emphasis">mdi-clock-outline</v-icon>
                <span class="text-body-2">{{ timeRange }}</span>
                <span v-if="durationLabel" class="text-caption text-medium-emphasis">
                  · {{ durationLabel }}
                </span>
              </div>
              <div class="d-flex align-center ga-2">
                <v-icon size="small" color="medium-emphasis">mdi-calendar-check-outline</v-icon>
                <span class="text-body-2 text-medium-emphasis">
                  Reservado el {{ reservedOn }}
                </span>
              </div>
            </div>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="6">
        <v-card variant="outlined" rounded="lg" class="h-100">
          <div class="pa-3 d-flex flex-column ga-2">
            <div class="section-title">
              <v-icon size="small" class="mr-1">mdi-tag-multiple-outline</v-icon>
              Servicio
            </div>
            <div class="d-flex flex-column ga-1">
              <div class="d-flex align-center ga-2">
                <v-icon size="small" color="medium-emphasis">mdi-view-grid-outline</v-icon>
                <span class="text-body-2 text-truncate">
                  {{ booking.service?.category?.name || 'Sin categoría' }}
                </span>
              </div>
              <div class="d-flex align-center ga-2">
                <v-avatar :color="serviceColor" size="12" />
                <span class="text-body-2 font-weight-medium text-truncate">
                  {{ booking.service?.name || 'Servicio' }}
                </span>
              </div>
              <div class="d-flex align-center ga-2">
                <v-icon size="small" color="medium-emphasis">mdi-cash</v-icon>
                <span class="text-body-2">{{ servicePrice }}</span>
              </div>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <div v-if="showActions && canUpdate" class="d-flex flex-column ga-2">
      <v-btn
        v-if="booking.status === 'confirmed' || booking.status === 'in_progress'"
        color="error"
        variant="outlined"
        block
        prepend-icon="mdi-calendar-remove"
        @click="showCancelDialog = true"
      >
        Cancelar turno
      </v-btn>
    </div>

    <CancelTurnDialog
      :visible="showCancelDialog"
      :booking="booking"
      :waitlist-entries="waitlistEntries ?? []"
      @close="showCancelDialog = false"
      @confirm="onCancelTurnConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useDisplay } from 'vuetify';
import { useAuthStore } from '@/shared/stores/auth.store';
import CancelTurnDialog from './CancelTurnDialog.vue';
import type { Booking, WaitlistEntry } from '../types/booking.types';

const props = defineProps<{
  booking: Booking;
  showActions?: boolean;
  waitlistEntries?: WaitlistEntry[];
}>();

const emit = defineEmits<{
  cancelTurn: [data: { assign: boolean; keepBlocked: boolean; reason: string }];
}>();

const authStore = useAuthStore();
const { xs } = useDisplay();
const showCancelDialog = ref(false);

const canUpdate = computed(() =>
  ['owner', 'admin', 'employee', 'super_admin'].includes(authStore.userRole ?? ''),
);

const dateLine = computed(() => {
  if (!props.booking.date) return '';
  const dt = new Date(`${props.booking.date}T12:00:00`);
  return dt.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
});

const timeRange = computed(() => {
  const s = props.booking.start_time?.slice(0, 5);
  const e = props.booking.end_time?.slice(0, 5);
  return [s, e].filter(Boolean).join(' - ');
});

const durationLabel = computed(() => {
  const mins = props.booking.custom_duration_minutes ?? props.booking.service?.duration_minutes;
  return mins ? `${mins} min` : '';
});

const reservedOn = computed(() => {
  if (!props.booking.created_at) return '';
  return new Date(props.booking.created_at).toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
});

const servicePrice = computed(() => {
  const price = props.booking.service?.price;
  if (price == null) return '—';
  return `$${(price / 100).toFixed(2)}`;
});

const serviceColor = computed(() => props.booking.service?.color ?? '#1976D2');

const statusColor = computed(() => {
  const map: Record<string, string> = {
    confirmed: 'success',
    in_progress: 'info',
    completed: 'grey',
    no_show: 'error',
    cancelled: 'error',
    pending_approval: 'warning',
    pending_confirmation: 'warning',
  };
  return map[props.booking.status] ?? 'grey';
});

const statusLabel = computed(() => {
  const map: Record<string, string> = {
    confirmed: 'Confirmada',
    in_progress: 'En curso',
    completed: 'Completada',
    no_show: 'No asistió',
    cancelled: 'Cancelada',
    pending_approval: 'Pendiente aprobación',
    pending_confirmation: 'Pendiente confirmación',
  };
  return map[props.booking.status] ?? props.booking.status ?? '';
});

const whatsappUrl = computed<string | undefined>(() => {
  if (!props.booking.whatsapp_consent) return undefined;
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
  const digits = props.booking.customer_phone?.replace(/\D/g, '');
  return digits ? `tel:${digits}` : undefined;
});

const hasWhatsapp = computed(() => !!whatsappUrl.value);
const hasPhone = computed(() => !!telUrl.value);

function onCancelTurnConfirm(data: {
  assign: boolean;
  keepBlocked: boolean;
  reason: string;
}) {
  emit('cancelTurn', data);
  showCancelDialog.value = false;
}
</script>

<style scoped>
.section-title {
  display: flex;
  align-items: center;
  font-weight: 700;
  font-size: 0.875rem;
}
</style>
