<template>
  <aside
    class="awp"
    :class="variant === 'sheet' ? 'awp--sheet' : 'awp--panel'"
    aria-label="Reservas del día seleccionado"
  >
    <div v-if="variant === 'sheet'" class="awp__sheet-head">
      <span class="awp__grabbar" aria-hidden="true" />
      <button
        type="button"
        class="awp__sheet-close"
        aria-label="Cerrar panel del día"
        @click="emit('close')"
      >
        <v-icon size="20" aria-hidden="true">mdi-close</v-icon>
      </button>
    </div>

    <div v-else class="awp__brand">
      <span class="awp__brand-label">Agenda</span>
    </div>

    <template v-if="day">
      <div class="awp__head">
        <span class="awp__eyebrow">Día seleccionado</span>
        <h2 class="awp__title">{{ dayLong }}</h2>
        <div class="awp__meta">
          {{ day.total }} {{ day.total === 1 ? 'reserva' : 'reservas' }}
          · {{ day.attended }} {{ day.attended === 1 ? 'atendida' : 'atendidas' }}
        </div>
        <div class="awp__seals">
          <span v-if="day.isClosed" class="awp__seal awp__seal--closed">
            <v-icon size="12" aria-hidden="true">mdi-check</v-icon>
            Cierre registrado
          </span>
          <span v-else-if="day.pendingClosure" class="awp__seal awp__seal--pending">
            <span class="awp__seal-dot" aria-hidden="true" />
            Pendiente de cierre
          </span>
          <span v-else-if="day.isFuture" class="awp__seal">Día futuro</span>
        </div>
      </div>

      <div class="awp__list">
        <button
          v-for="booking in selectedBookings"
          :key="booking.id"
          type="button"
          class="awp__booking"
          :class="{ 'awp__booking--cancelled': booking.status === 'cancelled' }"
          @click="emit('open-booking', booking)"
        >
          <span class="awp__booking-time">{{ timeOf(booking) }}</span>
          <span class="awp__booking-main">
            <span class="awp__booking-name">{{ booking.customer_name || 'Cliente' }}</span>
            <span class="awp__booking-meta">
              {{ booking.service?.name || 'Servicio' }}
              <template v-if="employeeOf(booking)"> · {{ employeeOf(booking) }}</template>
            </span>
          </span>
          <span class="awp__chip">
            <span class="awp__dot" :class="`awp__dot--${toneOf(booking)}`" aria-hidden="true" />
            {{ labelOf(booking) }}
          </span>
        </button>

        <p v-if="selectedBookings.length === 0" class="awp__empty">
          Sin reservas para este día.
        </p>

        <div v-if="blockedSlots && blockedSlots.length > 0" class="awp__blocks">
          <span class="awp__eyebrow">Horarios bloqueados</span>
          <div v-for="block in blockedSlots" :key="block.id" class="awp__block">
            <v-icon size="14" class="awp__block-icon" aria-hidden="true">mdi-lock-outline</v-icon>
            <span class="awp__block-time">
              {{ block.start_time?.slice(0, 5) }}–{{ block.end_time?.slice(0, 5) }}
            </span>
            <span class="awp__block-reason">{{ block.reason || 'Bloqueo manual' }}</span>
            <button
              type="button"
              class="awp__block-release"
              :aria-label="`Liberar bloqueo de ${block.start_time?.slice(0, 5)}`"
              @click="emit('open-block', block)"
            >
              Liberar
            </button>
          </div>
        </div>
      </div>

      <div class="awp__actions">
        <button
          v-if="day.pendingClosure && canClose"
          type="button"
          class="awp__cta"
          @click="emit('open-closure')"
        >
          <lord-icon
            class="awp__cta-icon"
            src="/animations/clipboard-text-reveal.json"
            state="in-reveal"
            trigger="loop(1500)"
            speed="1.5"
            loading="lazy"
            current-color
            @ready="onIconReady"
          />
          <span>Cerrar el día</span>
        </button>
        <button
          v-else-if="day.isClosed"
          type="button"
          class="awp__secondary"
          @click="emit('open-closure')"
        >
          Ver el cierre
        </button>

        <button
          v-if="day.pendingApproval > 0"
          type="button"
          class="awp__approval"
          @click="emit('go-approval')"
        >
          <span class="awp__dot awp__dot--warning" aria-hidden="true" />
          <span class="awp__approval-text">
            {{ day.pendingApproval }}
            {{ day.pendingApproval === 1 ? 'pendiente' : 'pendientes' }} de aprobación
          </span>
          <v-icon size="14" aria-hidden="true">mdi-chevron-right</v-icon>
        </button>

        <p v-if="day.pendingClosure && !canClose" class="awp__hint">
          Seleccioná un empleado para operar el cierre.
        </p>
      </div>
    </template>

    <div v-else class="awp__empty-state">
      <v-icon size="36" aria-hidden="true">mdi-calendar-month-outline</v-icon>
      <p class="awp__empty">Elegí un día del calendario para ver sus reservas.</p>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { format as fmt } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Booking, BlockedSlot } from '../types/booking.types';

const CLOSURE_CUTOFF_HOUR = 19;

const props = withDefaults(defineProps<{
  selectedDate: string | null;
  /** Reservas del mes visible; el panel filtra por el día seleccionado */
  bookings: Booking[];
  closedDates?: string[];
  blockedSlots?: BlockedSlot[];
  employeeNames?: Record<string, string>;
  /** Hay empleado seleccionado: se puede operar el cierre */
  canClose?: boolean;
  variant?: 'panel' | 'sheet';
}>(), {
  closedDates: () => [],
  blockedSlots: () => [],
  employeeNames: () => ({}),
  canClose: false,
  variant: 'panel',
});

const emit = defineEmits<{
  'open-booking': [booking: Booking];
  'open-block': [block: BlockedSlot];
  'open-closure': [];
  'go-approval': [];
  close: [];
}>();

const todayIso = new Date().toISOString().split('T')[0];
const nowHour = new Date().getHours();

const closedSet = computed(() => new Set(props.closedDates));

const day = computed(() => {
  const date = props.selectedDate;
  if (!date) return null;

  const list = props.bookings.filter((b) => b.date === date);
  const isClosed = closedSet.value.has(date);
  const isPast = date < todayIso;
  const isFuture = date > todayIso;
  let pendingClosure = false;
  if (date === todayIso) {
    pendingClosure = !isClosed && nowHour >= CLOSURE_CUTOFF_HOUR && list.length > 0;
  } else if (isPast) {
    pendingClosure = !isClosed && list.length > 0;
  }

  return {
    date,
    isClosed,
    isPast,
    isFuture,
    pendingClosure,
    pendingApproval: list.filter((b) => b.status === 'pending_approval').length,
    total: list.length,
    attended: list.filter((b) => b.status === 'completed').length,
  };
});

const dayLong = computed(() => {
  if (!props.selectedDate) return '';
  const label = fmt(new Date(`${props.selectedDate}T12:00:00`), "EEEE d 'de' MMMM", { locale: es });
  return label.charAt(0).toUpperCase() + label.slice(1);
});

const selectedBookings = computed(() => {
  const date = props.selectedDate;
  if (!date) return [];
  return props.bookings
    .filter((b) => b.date === date)
    .sort((a, b) => (a.start_time ?? '').localeCompare(b.start_time ?? ''));
});

function timeOf(booking: Booking) {
  return booking.start_time?.slice(0, 5) ?? '—';
}

function employeeOf(booking: Booking) {
  return booking.employee_id ? props.employeeNames[booking.employee_id] : null;
}

const STATUS_TONE: Record<string, string> = {
  confirmed: 'success',
  in_progress: 'info',
  completed: 'neutral',
  no_show: 'error',
  cancelled: 'error',
  pending_approval: 'warning',
};

const STATUS_LABEL: Record<string, string> = {
  confirmed: 'Confirmada',
  in_progress: 'En curso',
  completed: 'Atendida',
  no_show: 'No asistió',
  cancelled: 'Cancelada',
  pending_approval: 'Por aprobar',
};

function toneOf(booking: Booking) {
  return STATUS_TONE[booking.status ?? ''] ?? 'neutral';
}

function labelOf(booking: Booking) {
  return STATUS_LABEL[booking.status ?? ''] ?? booking.status ?? '';
}

// ─── Lordicon del CTA de cierre ─────────────────────────────
let ensureLordiconOnce: Promise<void> | null = null;
function ensureLordicon(): Promise<void> {
  ensureLordiconOnce ??= import('@lordicon/element').then((m) => m.defineElement());
  return ensureLordiconOnce;
}

onMounted(() => {
  void ensureLordicon();
});

/** Con movimiento reducido el loop deja el icono en el frame 0: fijarlo al final */
function onIconReady(event: Event) {
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const icon = event.currentTarget as (HTMLElement & { seek?: (target: string) => void }) | null;
  try {
    icon?.seek?.('end');
  } catch {
    /* noop */
  }
}
</script>

<style scoped>
.awp {
  --panel-hairline: rgb(var(--v-theme-surface), 0.14);
  --panel-soft: rgb(var(--v-theme-surface), 0.64);
  --panel-faint: rgb(var(--v-theme-surface), 0.42);
  --panel-hover: rgb(var(--v-theme-surface), 0.07);
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  background: rgb(var(--v-theme-on-surface));
  color: rgb(var(--v-theme-surface));
}

.v-theme--dark .awp {
  --panel-hairline: rgb(var(--v-theme-on-surface), 0.14);
  --panel-soft: rgb(var(--v-theme-on-surface), 0.64);
  --panel-faint: rgb(var(--v-theme-on-surface), 0.44);
  --panel-hover: rgb(var(--v-theme-on-surface), 0.07);
  background: rgb(var(--v-theme-surface-variant));
  color: rgb(var(--v-theme-on-surface));
}

.awp--panel {
  padding: 8px 20px 18px;
}

.awp--sheet {
  height: auto;
  max-height: 82dvh;
  border-radius: 18px 18px 0 0;
  padding: 6px 20px calc(16px + env(safe-area-inset-bottom, 0px));
}

/* ═══ Cabecera ═══ */
.awp__brand {
  display: flex;
  align-items: center;
  height: 52px;
  padding-left: 46px;
  border-bottom: 1px solid var(--panel-hairline);
  margin-bottom: 16px;
}

.awp__brand-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--panel-faint);
}

.awp__sheet-head {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 30px;
  flex-shrink: 0;
}

.awp__grabbar {
  width: 36px;
  height: 4px;
  border-radius: 999px;
  background: var(--panel-hairline);
}

.awp__sheet-close {
  position: absolute;
  top: 0;
  right: -6px;
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--panel-soft);
  cursor: pointer;
}

.awp__sheet-close:active {
  background: var(--panel-hover);
}

.awp__head {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--panel-hairline);
}

.awp__eyebrow {
  font-size: 9px;
  line-height: 1.4;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--panel-faint);
}

.awp__title {
  margin: 0;
  font-size: 17px;
  line-height: 1.25;
  font-weight: 700;
  color: currentColor;
}

.awp__meta {
  font-size: 11px;
  line-height: 1.4;
  font-variant-numeric: tabular-nums;
  color: var(--panel-soft);
}

.awp__seals {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding-top: 5px;
}

.awp__seal {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 22px;
  padding: 2px 8px;
  border: 1px solid var(--panel-hairline);
  border-radius: 4px;
  font-size: 9px;
  line-height: 1.4;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--panel-soft);
}

.awp__seal--closed {
  color: currentColor;
}

.awp__seal--closed :deep(.v-icon) {
  color: rgb(var(--v-theme-success));
}

.awp__seal--pending {
  border-style: dashed;
  border-color: rgb(var(--v-theme-warning), 0.55);
  color: var(--panel-soft);
}

.awp__seal-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: rgb(var(--v-theme-warning));
}

/* ═══ Lista ═══ */
.awp__list {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: none;
  padding: 4px 0;
}

.awp__list::-webkit-scrollbar {
  display: none;
}

.awp__booking {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  width: 100%;
  min-height: 44px;
  padding: 9px 6px;
  border: 0;
  border-bottom: 1px solid var(--panel-hairline);
  border-radius: 6px;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.awp__booking:last-of-type {
  border-bottom: 0;
}

.awp__booking:active {
  background: var(--panel-hover);
}

.awp__booking--cancelled {
  opacity: 0.5;
}

.awp__booking-time {
  flex-shrink: 0;
  padding-top: 1px;
  font-size: 11px;
  line-height: 1.4;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: currentColor;
}

.awp__booking-main {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.awp__booking-name {
  font-size: 12px;
  line-height: 1.35;
  font-weight: 600;
  color: currentColor;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.awp__booking-meta {
  font-size: 10px;
  line-height: 1.4;
  color: var(--panel-soft);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.awp__chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  padding: 1px 6px;
  border: 1px solid var(--panel-hairline);
  border-radius: 3px;
  font-size: 8.5px;
  line-height: 1.6;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--panel-soft);
}

.awp__dot {
  flex-shrink: 0;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--panel-faint);
}

.awp__dot--success { background: rgb(var(--v-theme-success)); }
.awp__dot--info { background: rgb(var(--v-theme-info)); }
.awp__dot--warning { background: rgb(var(--v-theme-warning)); }
.awp__dot--error { background: rgb(var(--v-theme-error)); }
.awp__dot--neutral { background: var(--panel-faint); }

.awp__empty {
  margin: 0;
  padding: 18px 4px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--panel-soft);
}

/* ═══ Bloqueos ═══ */
.awp__blocks {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 0 4px;
  margin-top: 6px;
  border-top: 1px solid var(--panel-hairline);
}

.awp__block {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  font-size: 10px;
  line-height: 1.4;
  color: var(--panel-soft);
}

.awp__block-icon {
  flex-shrink: 0;
  color: var(--panel-faint);
}

.awp__block-time {
  flex-shrink: 0;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: currentColor;
}

.awp__block-reason {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.awp__block-release {
  flex-shrink: 0;
  min-height: 44px;
  padding: 4px 10px;
  border: 1px solid var(--panel-hairline);
  border-radius: 4px;
  background: transparent;
  color: var(--panel-soft);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
}

.awp__block-release:active {
  background: var(--panel-hover);
}

/* ═══ Acciones ═══ */
.awp__actions {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid var(--panel-hairline);
}

.awp__cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  min-height: 52px;
  padding: 0 16px;
  border: 0;
  border-radius: 999px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  cursor: pointer;
  transition: transform 0.15s ease, filter 0.15s ease;
}

.v-theme--dark .awp__cta {
  background: rgb(var(--v-theme-on-surface));
  color: rgb(var(--v-theme-surface));
}

.awp__cta:active {
  transform: scale(0.985);
  filter: brightness(0.94);
}

.awp__cta-icon {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
}

.awp__secondary {
  width: 100%;
  min-height: 44px;
  border: 1px solid var(--panel-hairline);
  border-radius: 8px;
  background: transparent;
  color: currentColor;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
}

.awp__secondary:active {
  background: var(--panel-hover);
}

.awp__approval {
  display: flex;
  align-items: center;
  gap: 7px;
  min-height: 44px;
  padding: 6px 9px;
  border: 1px dashed var(--panel-hairline);
  border-radius: 6px;
  background: transparent;
  color: var(--panel-soft);
  font-size: 11px;
  line-height: 1.4;
  text-align: left;
  cursor: pointer;
}

.awp__approval:active {
  background: var(--panel-hover);
}

.awp__approval-text {
  flex: 1 1 auto;
  min-width: 0;
}

.awp__hint {
  margin: 0;
  font-size: 10px;
  line-height: 1.45;
  color: var(--panel-faint);
}

.awp__empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  flex: 1 1 auto;
  padding: 30px 0;
  text-align: center;
  color: var(--panel-soft);
}

.awp__empty-state .awp__empty {
  max-width: 210px;
  padding: 0;
}

@media (max-width: 699px) {
  .awp--panel {
    padding: 8px 16px 16px;
  }

  .awp__title {
    font-size: 16px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .awp__booking,
  .awp__cta {
    transition: none;
  }

  .awp__cta:active {
    transform: none;
  }
}
</style>
