<template>
  <div class="bwq">
    <!-- Strip de contexto: servicio · fecha formateada · hora tabular · empleado -->
    <section class="bwq__context">
      <div class="bwq__context__servicio">
        <span class="bwq__dot" :style="{ background: serviceColorValue }" aria-hidden="true" />
        <span class="bwq__context__name">{{ booking.service?.name || 'Servicio' }}</span>
        <span v-if="serviceCategory" class="bwq__micro">{{ serviceCategory }}</span>
      </div>
      <div class="bwq__context__cuando">
        <span class="bwq__context__fecha">{{ slotFecha }}</span>
        <template v-if="slotHora">
          <span class="bwq__context__sep" aria-hidden="true">·</span>
          <span class="bwq__context__hora">{{ slotHora }}</span>
        </template>
        <template v-if="employeeName">
          <span class="bwq__context__sep" aria-hidden="true">·</span>
          <span class="bwq__context__empleado">{{ employeeName }}</span>
        </template>
      </div>
    </section>

    <WaitlistQueueList
      v-if="hasWaitlist"
      :entries="waitlistEntries ?? []"
      :slot-label="slotLabel"
      :tenant-name="tenantName"
      hide-header
      @remove="emit('waitlistRemove', $event)"
    />

    <!-- Vacío con instrucción -->
    <div v-else class="bwq__empty">
      <v-icon size="40" color="medium-emphasis" aria-hidden="true">
        mdi-account-clock-outline
      </v-icon>
      <p class="bwq__empty__text">No hay personas en la cola para este turno.</p>
      <p class="bwq__empty__hint">
        Cuando alguien solicite este horario, aparecerá aquí con sus datos de contacto.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import WaitlistQueueList from './WaitlistQueueList.vue';
import { formatDate } from '@/shared/utils/format';
import type { Booking, WaitlistEntry } from '../types/booking.types';

const props = defineProps<{
  booking: Booking;
  waitlistEntries?: WaitlistEntry[];
  tenantName?: string;
}>();

const emit = defineEmits<{
  waitlistRemove: [entry: WaitlistEntry];
}>();

const queueCount = computed(() => props.waitlistEntries?.length ?? 0);
const hasWaitlist = computed(() => queueCount.value > 0);

const slotFecha = computed(() => (props.booking.date ? formatDate(props.booking.date) : ''));
const slotHora = computed(() => props.booking.start_time?.slice(0, 5) ?? '');

/** Etiqueta textual para el mensaje de WhatsApp de la cola */
const slotLabel = computed(() => {
  const base = slotFecha.value || props.booking.date;
  return slotHora.value ? `${base} a las ${slotHora.value}` : base;
});

const employeeName = computed(() => {
  const e = props.booking.employee;
  if (!e) return null;
  return `${e.first_name} ${e.last_name}`;
});

const serviceCategory = computed(() => props.booking.service?.category?.name ?? null);

/* Único color de marca: el dot del servicio; el fallback respeta el tema */
const serviceColorValue = computed(
  () => props.booking.service?.color || 'rgb(var(--v-theme-primary))',
);
</script>

<style scoped>
.bwq {
  --hairline: rgb(var(--v-theme-on-surface), 0.12);
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 14px 20px 20px;
}

.bwq__micro,
.bwq__empty__hint {
  font-size: 10px;
  line-height: 1.4;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-on-surface), 0.55);
}

/* Strip de contexto */
.bwq__context {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 0 12px;
  border-bottom: 1px solid var(--hairline);
}

.bwq__context__servicio {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.bwq__dot {
  width: 12px;
  height: 12px;
  flex-shrink: 0;
  border-radius: 50%;
}

.bwq__context__name {
  font-size: 14px;
  line-height: 1.3;
  font-weight: 700;
  color: rgb(var(--v-theme-on-surface));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bwq__context__cuando {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 12px;
  line-height: 1.4;
  color: rgb(var(--v-theme-on-surface), 0.6);
}

.bwq__context__fecha {
  font-variant-numeric: tabular-nums;
}

.bwq__context__hora {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: rgb(var(--v-theme-on-surface), 0.85);
}

.bwq__context__sep {
  color: rgb(var(--v-theme-on-surface), 0.35);
}

.bwq__context__empleado {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Vacío */
.bwq__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 32px 16px;
  text-align: center;
}

.bwq__empty__text {
  margin: 0;
  font-size: 13px;
  line-height: 1.45;
  color: rgb(var(--v-theme-on-surface), 0.75);
}

.bwq__empty__hint {
  font-weight: 400;
  letter-spacing: 0.02em;
  text-transform: none;
  max-width: 300px;
  color: rgb(var(--v-theme-on-surface), 0.45);
}
</style>
