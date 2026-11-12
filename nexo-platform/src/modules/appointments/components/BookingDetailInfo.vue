<template>
  <div class="bd">
    <!-- Sello de estado: cápsula tonal del family sello -->
    <div v-if="statusLabel" class="bd__head">
      <span class="bd__seal" :class="`bd__seal--${statusTone}`">{{ statusLabel }}</span>
    </div>

    <!-- Hero: servicio + franja horaria en tabular -->
    <section class="bd__hero">
      <div class="bd__hero__servicio">
        <span class="bd__dot" :style="{ background: serviceColorValue }" aria-hidden="true" />
        <span class="bd__hero__name">{{ booking.service?.name || 'Servicio' }}</span>
      </div>
      <span v-if="serviceCategory" class="bd__micro">{{ serviceCategory }}</span>
      <div class="bd__hero__cuando">
        <span class="bd__hero__fecha">{{ dateLine }}</span>
        <div class="bd__hero__franja">
          <span class="bd__hero__rango">{{ timeRange }}</span>
          <span v-if="durationLabel" class="bd__hero__duracion">{{ durationLabel }}</span>
        </div>
      </div>
      <div class="bd__hero__footnote">
        Reservado el {{ reservedOn }}<template v-if="booking.participant_count > 1">
          ·
          {{ booking.participant_count }} participantes
        </template>
      </div>
    </section>

    <!-- SERVICIO: filas de ticket etiqueta → valor -->
    <section class="bd__section">
      <span class="bd__section-label">Servicio</span>
      <div class="bd__rows">
        <div class="bd__row">
          <span class="bd__row__label">Categoría</span>
          <span class="bd__row__value">{{ booking.service?.category?.name || 'Sin categoría' }}</span>
        </div>
        <div class="bd__row">
          <span class="bd__row__label">Precio</span>
          <span class="bd__row__value bd__num">{{ servicePrice }}</span>
        </div>
      </div>
    </section>

    <!-- CLIENTE -->
    <section class="bd__section">
      <span class="bd__section-label">Cliente</span>
      <div class="bd__rows">
        <div class="bd__row">
          <span class="bd__row__label">Nombre</span>
          <span class="bd__row__value">{{ booking.customer_name || 'Sin nombre' }}</span>
        </div>
        <div class="bd__row">
          <span class="bd__row__label">Teléfono</span>
          <a v-if="hasPhone" class="bd__row__value bd__link" :href="telUrl">{{ booking.customer_phone }}</a>
          <span v-else class="bd__row__value bd__muted">Sin teléfono</span>
        </div>
        <div class="bd__row">
          <span class="bd__row__label">Email</span>
          <a
            v-if="booking.customer_email"
            class="bd__row__value bd__link"
            :href="`mailto:${booking.customer_email}`"
          >{{ booking.customer_email }}</a>
          <span v-else class="bd__row__value bd__muted">Sin email</span>
        </div>
      </div>
    </section>

    <!-- Acciones de contacto: fila compacta de 44px -->
    <div v-if="hasWhatsapp || booking.customer_email" class="bd__actions">
      <v-btn
        v-if="hasWhatsapp"
        color="success"
        variant="tonal"
        rounded="md"
        prepend-icon="mdi-whatsapp"
        :href="whatsappUrl"
        target="_blank"
        rel="noopener"
      >
        WhatsApp
      </v-btn>
      <v-btn
        v-if="hasPhone && xs"
        variant="tonal"
        rounded="md"
        prepend-icon="mdi-phone"
        :href="telUrl"
      >
        Llamar
      </v-btn>
      <v-btn
        v-if="booking.customer_email"
        variant="tonal"
        rounded="md"
        prepend-icon="mdi-email-outline"
        :href="`mailto:${booking.customer_email}`"
      >
        Correo
      </v-btn>
    </div>

    <!-- Zona de cancelación -->
    <div
      v-if="showActions && canUpdate && (booking.status === 'confirmed' || booking.status === 'in_progress')"
      class="bd__danger"
    >
      <v-btn
        variant="text"
        color="error"
        class="bd__danger-btn"
        prepend-icon="mdi-calendar-remove"
        title="Anula la cita y libera (o mantiene ocupado) el horario"
        @click="showCancelDialog = true"
      >
        Cancelar turno
      </v-btn>
    </div>

    <CancelTurnDialog
      :visible="showCancelDialog"
      :booking="booking"
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
import type { Booking } from '../types/booking.types';

const props = defineProps<{
  booking: Booking;
  showActions?: boolean;
}>();

const emit = defineEmits<{
  cancelTurn: [data: { keepBlocked: boolean; reason: string }];
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
  const dt = new Date(props.booking.created_at);
  const fecha = dt.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const hora = dt.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  return `${fecha} ${hora}`;
});

const servicePrice = computed(() => {
  const price = props.booking.service?.price;
  if (price == null) return '—';
  return `$${(price / 100).toFixed(2)}`;
});

/* Único color de marca: el dot del servicio; el fallback respeta el tema */
const serviceColorValue = computed(
  () => props.booking.service?.color || 'rgb(var(--v-theme-primary))',
);
const serviceCategory = computed(() => props.booking.service?.category?.name ?? '');

const statusTone = computed(() => {
  const map: Record<string, string> = {
    confirmed: 'success',
    in_progress: 'info',
    completed: 'neutral',
    no_show: 'error',
    cancelled: 'error',
    pending_approval: 'warning',
  };
  return map[props.booking.status] ?? 'neutral';
});

const statusLabel = computed(() => {
  const map: Record<string, string> = {
    confirmed: 'Confirmada',
    in_progress: 'En curso',
    completed: 'Completada',
    no_show: 'No asistió',
    cancelled: 'Cancelada',
    pending_approval: 'Pendiente aprobación',
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
  keepBlocked: boolean;
  reason: string;
}) {
  emit('cancelTurn', data);
  showCancelDialog.value = false;
}
</script>

<style scoped>
.bd {
  --hairline: rgb(var(--v-theme-on-surface), 0.12);
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 14px 20px 20px;
}

/* Micro-label de sección: la gramática 10px/0.14em del cierre */
.bd__micro,
.bd__section-label {
  font-size: 10px;
  line-height: 1.4;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-on-surface), 0.55);
}

/* Sello de estado */
.bd__head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.bd__seal {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  border: 1px solid transparent;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
}

.bd__seal--success {
  border-color: rgb(var(--v-theme-success), 0.35);
  background: rgb(var(--v-theme-success), 0.08);
  color: rgb(var(--v-theme-success));
}

.bd__seal--info {
  border-color: rgb(var(--v-theme-info), 0.35);
  background: rgb(var(--v-theme-info), 0.08);
  color: rgb(var(--v-theme-info));
}

.bd__seal--warning {
  border-color: rgb(var(--v-theme-warning), 0.35);
  background: rgb(var(--v-theme-warning), 0.08);
  color: rgb(var(--v-theme-warning));
}

.bd__seal--error {
  border-color: rgb(var(--v-theme-error), 0.35);
  background: rgb(var(--v-theme-error), 0.08);
  color: rgb(var(--v-theme-error));
}

.bd__seal--neutral {
  border-color: var(--hairline);
  background: rgb(var(--v-theme-on-surface), 0.05);
  color: rgb(var(--v-theme-on-surface), 0.65);
}

/* Hero */
.bd__hero {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.bd__hero__servicio {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.bd__dot {
  width: 12px;
  height: 12px;
  flex-shrink: 0;
  border-radius: 50%;
}

.bd__hero__name {
  font-size: 16px;
  line-height: 1.3;
  font-weight: 700;
  color: rgb(var(--v-theme-on-surface));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bd__hero__cuando {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-top: 4px;
}

.bd__hero__fecha {
  font-size: 12px;
  line-height: 1.4;
  letter-spacing: 0.02em;
  color: rgb(var(--v-theme-on-surface), 0.6);
}

.bd__hero__franja {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.bd__hero__rango {
  font-size: 22px;
  line-height: 1.2;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: rgb(var(--v-theme-on-surface));
}

.bd__hero__duracion {
  font-size: 11px;
  line-height: 1.4;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.04em;
  color: rgb(var(--v-theme-primary));
  font-weight: 600;
}

.bd__hero__footnote {
  padding-top: 4px;
  border-top: 1px dashed var(--hairline);
  margin-top: 4px;
  font-size: 11px;
  line-height: 1.4;
  font-variant-numeric: tabular-nums;
  color: rgb(var(--v-theme-on-surface), 0.55);
}

/* Secciones de ticket */
.bd__section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.bd__rows {
  display: flex;
  flex-direction: column;
}

.bd__row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  min-height: 34px;
  padding: 6px 0;
  border-bottom: 1px solid var(--hairline);
}

.bd__rows .bd__row:last-child {
  border-bottom: 0;
}

.bd__row__label {
  flex-shrink: 0;
  font-size: 11px;
  line-height: 1.4;
  letter-spacing: 0.02em;
  color: rgb(var(--v-theme-on-surface), 0.55);
}

.bd__row__value {
  min-width: 0;
  text-align: right;
  font-size: 13px;
  line-height: 1.4;
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface), 0.9);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bd__num {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.bd__muted {
  font-weight: 400;
  color: rgb(var(--v-theme-on-surface), 0.4);
}

.bd__link {
  text-decoration: underline;
  text-underline-offset: 3px;
  text-decoration-color: rgb(var(--v-theme-on-surface), 0.35);
  color: rgb(var(--v-theme-on-surface), 0.9);
}

.bd__link:hover,
.bd__link:focus-visible {
  color: rgb(var(--v-theme-primary));
  text-decoration-color: rgb(var(--v-theme-primary));
}

/* Acciones de contacto */
.bd__actions {
  display: flex;
  gap: 8px;
}

.bd__actions .v-btn {
  flex: 1 1 0;
  min-width: 0;
  min-height: 44px;
}

.bd__actions .v-btn :deep(.v-btn__content) {
  font-size: 12px;
  font-weight: 600;
}

@media (min-width: 700px) {
  .bd__actions {
    justify-content: flex-end;
  }

  .bd__actions .v-btn {
    flex: 0 1 auto;
  }
}

/* Zona de cancelación */
.bd__danger {
  display: flex;
  justify-content: flex-end;
  padding-top: 10px;
  border-top: 1px solid var(--hairline);
}

.bd__danger-btn.v-btn {
  min-height: 44px;
  text-transform: none;
  letter-spacing: 0;
  font-weight: 600;
}

.bd__danger-btn.v-btn:not(:disabled):active {
  background: rgb(var(--v-theme-error), 0.08);
}

@media (prefers-reduced-motion: reduce) {
  .bd__link,
  .bd__danger-btn {
    transition: none;
  }
}
</style>
