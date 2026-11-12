<template>
  <div>
    <!-- Solo en modo standalone (el drawer consume la lista sin header) -->
    <template v-if="!hideHeader">
      <div class="wq__head">
        <span class="wq__section-label">En cola para este turno</span>
        <span v-if="entries.length > 0" class="wq__count">{{ entries.length }}</span>
      </div>
      <p class="wq__hint">
        {{ entries.length }} cliente{{ entries.length === 1 ? '' : 's' }}
        solicita{{ entries.length === 1 ? '' : 'n' }} este turno.
      </p>
    </template>

    <!-- Lista numerada editorial -->
    <div class="wq__list">
      <div v-for="(entry, index) in entries" :key="entry.id" class="wq__row">
        <span class="wq__row__index" aria-hidden="true">{{ (index + 1).toString().padStart(2, '0') }}</span>

        <div class="wq__row__main">
          <div class="wq__row__name">{{ entry.customer_name }}</div>
          <div class="wq__row__meta">
            <span>{{ entry.customer_phone || 'Sin teléfono' }}</span>
            <template v-if="entry.customer_phone && entry.customer_email">
              <span class="wq__row__sep" aria-hidden="true">·</span>
            </template>
            <span v-if="entry.customer_email">{{ entry.customer_email }}</span>
          </div>
          <div class="wq__row__chips">
            <span class="wq__chip">{{ entry.service?.name || 'Servicio' }}</span>
            <span v-if="entry.preference === 'flexible'" class="wq__chip wq__chip--flexible">
              Flexible
            </span>
          </div>
        </div>

        <div class="wq__row__actions">
          <v-btn
            v-if="entry.customer_phone"
            size="small"
            icon
            variant="tonal"
            color="success"
            title="Abrir chat de WhatsApp"
            @click="openWhatsApp(entry)"
          >
            <v-icon>mdi-whatsapp</v-icon>
          </v-btn>
          <v-btn
            v-if="entry.customer_phone"
            size="small"
            icon
            variant="tonal"
            color="surface"
            title="Llamar"
            :href="`tel:${entry.customer_phone}`"
          >
            <v-icon>mdi-phone</v-icon>
          </v-btn>
          <v-btn
            v-if="entry.customer_email"
            size="small"
            icon
            variant="tonal"
            color="surface"
            title="Enviar email"
            :href="`mailto:${entry.customer_email}`"
          >
            <v-icon>mdi-email-outline</v-icon>
          </v-btn>
          <v-btn
            size="small"
            icon
            variant="text"
            title="Quitar de la lista"
            @click="emit('remove', entry)"
          >
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { WaitlistEntry } from '../types/booking.types';

const props = defineProps<{
  entries: WaitlistEntry[];
  slotLabel?: string;
  tenantName?: string;
  hideHeader?: boolean;
}>();

const emit = defineEmits<{
  remove: [entry: WaitlistEntry];
}>();

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
.wq__section-label {
  font-size: 10px;
  line-height: 1.4;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-on-surface), 0.55);
}

.wq__head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.wq__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  padding: 1px 5px;
  border: 1px solid rgb(var(--v-theme-primary), 0.35);
  border-radius: 4px;
  background: rgb(var(--v-theme-primary), 0.08);
  color: rgb(var(--v-theme-primary));
  font-size: 10px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.wq__hint {
  margin: 0 0 10px;
  font-size: 12px;
  line-height: 1.45;
  color: rgb(var(--v-theme-on-surface), 0.55);
}

.wq__list {
  display: flex;
  flex-direction: column;
}

.wq__row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid rgb(var(--v-theme-on-surface), 0.12);
}

.wq__row:last-child {
  border-bottom: 0;
}

.wq__row__index {
  flex-shrink: 0;
  width: 24px;
  padding-top: 2px;
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.06em;
  color: rgb(var(--v-theme-on-surface), 0.4);
}

.wq__row__main {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.wq__row__name {
  font-size: 13px;
  line-height: 1.35;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wq__row__meta {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 4px;
  font-size: 11px;
  line-height: 1.4;
  font-variant-numeric: tabular-nums;
  color: rgb(var(--v-theme-on-surface), 0.55);
}

.wq__row__sep {
  color: rgb(var(--v-theme-on-surface), 0.35);
}

.wq__row__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding-top: 2px;
}

.wq__chip {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border: 1px solid rgb(var(--v-theme-primary), 0.3);
  border-radius: 4px;
  background: rgb(var(--v-theme-primary), 0.07);
  color: rgb(var(--v-theme-primary));
  font-size: 10px;
  line-height: 1.3;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.wq__chip--flexible {
  border-color: rgb(var(--v-theme-on-surface), 0.16);
  background: rgb(var(--v-theme-on-surface), 0.04);
  color: rgb(var(--v-theme-on-surface), 0.6);
}

/* Acciones de la fila */
.wq__row__actions {
  display: flex;
  flex-shrink: 0;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 4px;
}

.wq__row__actions .v-btn {
  min-height: 40px;
}

/* Targets táctiles ≥44px en móvil */
@media (max-width: 699px) {
  .wq__row__actions .v-btn {
    width: 44px;
    height: 44px;
  }
}

/* Confirmación táctil: :active en toda acción de la fila */
.wq__row__actions :deep(.v-btn:not(:disabled):active) {
  background: rgb(var(--v-theme-on-surface), 0.08);
}
</style>
