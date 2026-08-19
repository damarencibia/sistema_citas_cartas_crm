<template>
  <div>
    <template v-if="!hideHeader">
      <div class="d-flex align-center ga-2 mb-2">
        <v-icon size="small" color="primary">mdi-account-clock-outline</v-icon>
        <span class="text-subtitle-2 font-weight-bold">
          En cola para este turno
          <v-chip
            size="small"
            variant="tonal"
            color="primary"
            class="ml-1"
          >
            {{ entries.length }}
          </v-chip>
        </span>
      </div>

      <p class="text-body-2 text-medium-emphasis mb-2">
        {{ entries.length }} cliente{{ entries.length === 1 ? '' : 's' }}
        solicita{{ entries.length === 1 ? '' : 'n' }} este turno.
      </p>
    </template>

    <v-list density="compact" class="bg-transparent waitlist-queue__list">
      <v-list-item v-for="entry in entries" :key="entry.id" class="waitlist-queue__item">
        <template #title>
          <div class="d-flex align-center ga-2 flex-wrap">
            <span class="text-subtitle-2">{{ entry.customer_name }}</span>
            <v-chip
              size="x-small"
              variant="tonal"
              color="primary"
              label
            >
              {{ entry.service?.name || 'Servicio' }}
            </v-chip>
            <v-chip
              v-if="entry.preference === 'flexible'"
              size="x-small"
              variant="tonal"
              label
            >
              Flexible
            </v-chip>
          </div>
        </template>
        <template #subtitle>
          <div class="text-caption">
            {{ entry.customer_phone || 'Sin teléfono' }}
            <template v-if="entry.customer_phone && entry.customer_email"> · </template>
            {{ entry.customer_email }}
          </div>
        </template>
        <template #append>
          <div class="d-flex ga-1">
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
              color="primary"
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
              color="info"
              title="Enviar email"
              :href="`mailto:${entry.customer_email}`"
            >
              <v-icon>mdi-email-outline</v-icon>
            </v-btn>
            <v-btn
              size="small"
              variant="tonal"
              color="primary"
              prepend-icon="mdi-calendar-plus"
              title="Pasar este cliente a la agenda"
              @click="emit('convert', entry)"
            >
              Agenda
            </v-btn>
            <v-btn
              size="small"
              icon="mdi-close"
              variant="text"
              title="Quitar de la lista"
              @click="emit('remove', entry)"
            />
          </div>
        </template>
      </v-list-item>
    </v-list>
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
  convert: [entry: WaitlistEntry];
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
.waitlist-queue__list {
  max-height: none;
}

.waitlist-queue__item :deep(.v-list-item__append) {
  padding-inline-start: 8px;
}
</style>
