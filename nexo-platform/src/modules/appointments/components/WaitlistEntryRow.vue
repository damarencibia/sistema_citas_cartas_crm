<template>
  <div class="wlrow">
    <span v-if="index" class="wlrow__index" aria-hidden="true">
      {{ index.toString().padStart(2, '0') }}
    </span>

    <div class="wlrow__main">
      <div class="wlrow__top">
        <span class="wlrow__name">{{ entry.customer_name }}</span>
        <span v-if="showStatus" class="wlrow__status">
          <span class="ws-dot" :class="statusDotClass(entry.status)" aria-hidden="true" />
          {{ statusLabel(entry.status) }}
        </span>
      </div>

      <div class="wlrow__meta">
        <span>{{ entry.customer_phone || 'Sin teléfono' }}</span>
        <template v-if="entry.customer_phone && entry.customer_email">
          <span class="wlrow__sep" aria-hidden="true">·</span>
        </template>
        <span v-if="entry.customer_email">{{ entry.customer_email }}</span>
      </div>

      <div class="wlrow__chips">
        <span class="wlrow__chip">{{ entry.service?.name || 'Servicio' }}</span>
        <span v-if="entry.preference === 'flexible'" class="wlrow__chip wlrow__chip--soft">
          Flexible
        </span>
        <span v-if="showPreferred && entry.preferred_date" class="wlrow__chip wlrow__chip--soft">
          {{ formatShortDate(entry.preferred_date) }}
        </span>
        <span v-if="showPreferred" class="wlrow__chip wlrow__chip--soft">
          {{ timesLabel(entry) }}
        </span>
        <span
          v-if="showEmployee && entry.employee"
          class="wlrow__chip wlrow__chip--soft"
        >
          {{ entry.employee.first_name }} {{ entry.employee.last_name }}
        </span>
      </div>
    </div>

    <div
      v-if="entry.customer_phone || entry.customer_email || showRemove"
      class="wlrow__actions"
    >
      <v-btn
        v-if="entry.customer_phone"
        icon
        size="small"
        variant="text"
        class="wlrow__action"
        :aria-label="`Abrir WhatsApp de ${entry.customer_name}`"
        title="Abrir chat de WhatsApp"
        @click="openWhatsApp(entry)"
      >
        <v-icon size="19">mdi-whatsapp</v-icon>
      </v-btn>

      <v-btn
        v-if="entry.customer_phone"
        icon
        size="small"
        variant="text"
        class="wlrow__action"
        :aria-label="`Llamar a ${entry.customer_name}`"
        title="Llamar"
        :href="`tel:${entry.customer_phone}`"
      >
        <v-icon size="19">mdi-phone-outline</v-icon>
      </v-btn>

      <v-btn
        v-if="entry.customer_email"
        icon
        size="small"
        variant="text"
        class="wlrow__action"
        :aria-label="`Enviar email a ${entry.customer_name}`"
        title="Enviar email"
        :href="`mailto:${entry.customer_email}`"
      >
        <v-icon size="19">mdi-email-outline</v-icon>
      </v-btn>

      <v-btn
        v-if="showRemove"
        icon
        size="small"
        variant="text"
        class="wlrow__action wlrow__action--remove"
        :aria-label="`Quitar a ${entry.customer_name} de la lista`"
        title="Quitar de la lista"
        @click="emit('remove', entry)"
      >
        <v-icon size="19">mdi-close</v-icon>
      </v-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { WaitlistEntry } from '../types/booking.types';

const props = withDefaults(defineProps<{
  entry: WaitlistEntry;
  index?: number;
  showStatus?: boolean;
  showPreferred?: boolean;
  showEmployee?: boolean;
  showRemove?: boolean;
  slotLabel?: string;
  tenantName?: string;
}>(), {
  index: 0,
  showStatus: false,
  showPreferred: false,
  showEmployee: false,
  showRemove: true,
  slotLabel: '',
  tenantName: '',
});

const emit = defineEmits<{
  remove: [entry: WaitlistEntry];
}>();

function statusLabel(status: WaitlistEntry['status']): string {
  const map: Record<WaitlistEntry['status'], string> = {
    waiting: 'Esperando',
    notified: 'Notificado',
    converted: 'Convertido',
    expired: 'Expirado',
    cancelled: 'Cancelado',
  };
  return map[status] ?? status;
}

function statusDotClass(status: WaitlistEntry['status']): string {
  const map: Record<WaitlistEntry['status'], string> = {
    waiting: 'ws-dot--warning',
    notified: 'ws-dot--info',
    converted: 'ws-dot--success',
    expired: 'ws-dot--error',
    cancelled: '',
  };
  return map[status] ?? '';
}

function formatShortDate(dateStr: string): string {
  const value = new Date(`${dateStr}T00:00:00`).toLocaleDateString('es-MX', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function format12(time: string | null): string {
  if (!time) return '—';
  const [h, m] = time.split(':').map(Number);
  if (Number.isNaN(h)) return '—';
  const suffix = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m || 0).padStart(2, '0')} ${suffix}`;
}

function timesLabel(entry: WaitlistEntry): string {
  if (entry.preferred_times?.length) {
    return entry.preferred_times.map((t) => format12(t)).join(' · ');
  }
  if (entry.preferred_time_start) {
    const end = entry.preferred_time_end ? ` a ${format12(entry.preferred_time_end)}` : '';
    return `${format12(entry.preferred_time_start)}${end}`;
  }
  return 'Cualquier hora';
}

function openWhatsApp(entry: WaitlistEntry) {
  const digits = (entry.customer_phone ?? '').replace(/\D/g, '');
  if (!digits) return;
  const msg =
    `Hola ${entry.customer_name},` +
    (props.slotLabel
      ? ` te avisamos que el turno del ${props.slotLabel} está disponible.`
      : ' te avisamos que hay un turno disponible.') +
    ` ¿Te lo confirmamos${props.tenantName ? ` en ${props.tenantName}` : ''}?`;
  window.open(`https://wa.me/${digits}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
}
</script>

<style scoped>
.wlrow {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 0;
  border-bottom: 1px solid rgb(var(--v-theme-on-surface), 0.1);
}

.wlrow:last-child {
  border-bottom: 0;
}

.wlrow__index {
  flex-shrink: 0;
  width: 22px;
  padding-top: 2px;
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.06em;
  color: rgb(var(--v-theme-on-surface), 0.38);
}

.wlrow__main {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.wlrow__top {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.wlrow__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  line-height: 1.35;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
}

.wlrow__status {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 9px;
  line-height: 1.4;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-on-surface), 0.5);
}

.wlrow__meta {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 11px;
  line-height: 1.4;
  font-variant-numeric: tabular-nums;
  color: rgb(var(--v-theme-on-surface), 0.55);
}

.wlrow__sep {
  color: rgb(var(--v-theme-on-surface), 0.3);
}

.wlrow__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding-top: 2px;
}

.wlrow__chip {
  display: inline-flex;
  align-items: center;
  min-height: 20px;
  padding: 1px 7px;
  border: 1px solid rgb(var(--v-theme-on-surface), 0.16);
  border-radius: 4px;
  background: rgb(var(--v-theme-on-surface), 0.035);
  color: rgb(var(--v-theme-on-surface), 0.68);
  font-size: 9px;
  line-height: 1.25;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.wlrow__chip--soft {
  border-color: rgb(var(--v-theme-on-surface), 0.1);
  background: transparent;
  color: rgb(var(--v-theme-on-surface), 0.48);
}

.wlrow__actions {
  flex-shrink: 0;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 2px;
}

.wlrow__action.v-btn {
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  color: rgb(var(--v-theme-on-surface), 0.6);
}

.wlrow__action--remove.v-btn {
  color: rgb(var(--v-theme-on-surface), 0.42);
}

.wlrow__actions :deep(.v-btn:not(:disabled):active) {
  background: rgb(var(--v-theme-on-surface), 0.08);
}

@media (max-width: 699px) {
  .wlrow {
    flex-wrap: wrap;
    gap: 6px;
  }

  .wlrow__index {
    width: 20px;
  }

  .wlrow__actions {
    width: 100%;
    justify-content: flex-end;
    margin-top: 1px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .wlrow__action.v-btn {
    transition: none !important;
  }
}
</style>
