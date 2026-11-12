<template>
  <v-dialog :model-value="visible" max-width="440" @update:model-value="emit('close')">
    <v-card rounded="md" class="closure-dialog-card">
      <v-card-title class="closure-dialog-title">
        Cancelar turno
        <span v-if="booking" class="closure-dialog-title__sub">
          {{ bookingSummary }}
        </span>
      </v-card-title>

      <v-card-text class="closure-form">
        <!-- ¿Qué hacer con el horario? Filas seleccionables ≥44px -->
        <div class="closure-field">
          <span class="closure-field__label">¿Qué hacer con el horario?</span>
          <div role="radiogroup" aria-label="¿Qué hacer con el horario?">
            <button
              type="button"
              role="radio"
              :aria-checked="!keepBlocked"
              class="ctd__option"
              :class="{ 'ctd__option--active': !keepBlocked }"
              @click="keepBlocked = false"
            >
              <v-icon class="ctd__option__radio" aria-hidden="true">
                {{ !keepBlocked ? 'mdi-radiobox-marked' : 'mdi-radiobox-blank' }}
              </v-icon>
              <span class="ctd__option__texts">
                <span class="ctd__option__title">Marcar disponible</span>
                <span class="ctd__option__sub">El horario queda libre para nuevos turnos</span>
              </span>
            </button>
            <button
              type="button"
              role="radio"
              :aria-checked="keepBlocked"
              class="ctd__option"
              :class="{ 'ctd__option--active': keepBlocked }"
              @click="keepBlocked = true"
            >
              <v-icon class="ctd__option__radio" aria-hidden="true">
                {{ keepBlocked ? 'mdi-radiobox-marked' : 'mdi-radiobox-blank' }}
              </v-icon>
              <span class="ctd__option__texts">
                <span class="ctd__option__title">Mantener ocupado</span>
                <span class="ctd__option__sub">El horario se bloquea igual que un turno (en rojo)</span>
              </span>
            </button>
          </div>
        </div>

        <!-- Motivo: textarea underlined Variante A -->
        <div class="closure-field">
          <span class="closure-field__label">Motivo de cancelación (opcional)</span>
          <v-textarea
            v-model="reason"
            variant="underlined"
            label="Motivo de cancelación"
            rows="2"
            auto-grow
            class="closure-input"
            hide-details
            spellcheck="false"
          />
        </div>
      </v-card-text>

      <v-card-actions class="closure-dialog-actions">
        <v-btn variant="text" class="closure-dialog-btn" @click="emit('close')">Volver</v-btn>
        <v-spacer />
        <v-btn
          color="error"
          variant="flat"
          class="closure-dialog-btn"
          :loading="loading"
          @click="onConfirm"
        >
          Cancelar turno
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { formatDate } from '@/shared/utils/format';
import type { Booking } from '../types/booking.types';

const props = defineProps<{
  visible: boolean;
  booking: Booking | null;
}>();

const emit = defineEmits<{
  close: [];
  confirm: [data: { keepBlocked: boolean; reason: string }];
}>();

const loading = ref(false);
const keepBlocked = ref(false);
const reason = ref('');

watch(
  () => props.visible,
  (v) => {
    if (v) {
      keepBlocked.value = false;
      reason.value = '';
    }
  },
);

/** Contexto en el subtítulo del shell: cliente — servicio · fecha hora */
const bookingSummary = computed(() => {
  if (!props.booking) return '';
  const name = props.booking.customer_name || 'Sin nombre';
  const service = props.booking.service?.name || 'Servicio';
  const fecha = props.booking.date ? formatDate(props.booking.date) : '';
  const hora = props.booking.start_time?.slice(0, 5) ?? props.booking.end_time?.slice(0, 5) ?? '';
  return [`${name} — ${service}`, [fecha, hora].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(' · ');
});

function onConfirm() {
  emit('confirm', {
    keepBlocked: keepBlocked.value,
    reason: reason.value,
  });
}
</script>

<style scoped>
/* Filas seleccionables: radio de gramática editorial con:active inmediato */
.ctd__option {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
  min-height: 44px;
  padding: 10px 4px;
  border: 0;
  border-bottom: 1px solid rgb(var(--v-theme-on-surface), 0.12);
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.ctd__option:last-child {
  border-bottom: 0;
}

.ctd__option:not(:disabled):active {
  background: rgb(var(--v-theme-on-surface), 0.06);
}

.ctd__option__radio {
  flex-shrink: 0;
  padding-top: 1px;
  font-size: 20px;
  color: rgb(var(--v-theme-on-surface), 0.4);
  transition: color 0.15s ease;
}

.ctd__option--active .ctd__option__radio {
  color: rgb(var(--v-theme-primary));
}

.ctd__option__texts {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.ctd__option__title {
  font-size: 14px;
  line-height: 1.35;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface), 0.9);
}

.ctd__option--active .ctd__option__title {
  color: rgb(var(--v-theme-on-surface));
}

.ctd__option__sub {
  font-size: 11px;
  line-height: 1.4;
  color: rgb(var(--v-theme-on-surface), 0.55);
}

@media (prefers-reduced-motion: reduce) {
  .ctd__option__radio {
    transition: none;
  }
}
</style>
