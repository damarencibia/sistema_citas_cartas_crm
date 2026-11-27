<template>
  <div class="wsa">
    <div
      v-for="day in days"
      :key="day.value"
      class="wsa__day"
      :class="{
        'wsa__day--enabled': isEnabled(day.value),
        'wsa__day--closed': !isBusinessDay(day.value),
      }"
    >
      <div
        class="wsa__header"
        :class="{ 'wsa__header--clickable': isEnabled(day.value) }"
        :role="isEnabled(day.value) ? 'button' : undefined"
        :tabindex="isEnabled(day.value) ? 0 : undefined"
        :aria-expanded="isEnabled(day.value) ? isExpanded(day.value) : undefined"
        @click="onHeaderClick(day.value)"
        @keydown.enter.prevent="onHeaderClick(day.value)"
        @keydown.space.prevent="onHeaderClick(day.value)"
      >
        <div class="wsa__name">
          <span class="wsa__dayname">{{ day.label }}</span>
          <span class="wsa__summary">{{ summary(day.value) }}</span>
        </div>

        <span v-if="frameLabel(day.value)" class="wsa__frame">
          Marco {{ frameLabel(day.value) }}
        </span>

        <v-icon
          class="wsa__chevron"
          :class="{ 'wsa__chevron--open': isExpanded(day.value) && isEnabled(day.value) }"
          size="18"
          aria-hidden="true"
        >
          mdi-chevron-down
        </v-icon>

        <div
          class="wsa__controls"
          @click.stop
          @keydown.enter.stop
          @keydown.space.stop
        >
          <v-menu v-if="isEnabled(day.value) && getShifts(day.value).length > 0" location="bottom end">
            <template #activator="{ props: menuProps }">
              <button
                v-bind="menuProps"
                type="button"
                class="wsa__icon-btn"
                :aria-label="`Opciones para ${day.label}`"
              >
                <v-icon size="18" aria-hidden="true">mdi-dots-vertical</v-icon>
              </button>
            </template>
            <v-list density="compact" class="wsa__menu">
              <v-list-item @click="emit('copy-day', day.value)">
                <v-list-item-title class="text-caption">
                  Copiar día a toda la semana
                </v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>

          <v-switch
            :model-value="isEnabled(day.value)"
            :disabled="!isBusinessDay(day.value) && !isEnabled(day.value)"
            :aria-label="`Activar ${day.label}`"
            color="on-surface"
            density="compact"
            hide-details
            class="ws-switch wsa__switch"
            @update:model-value="onToggle(day.value, !!$event)"
          />
        </div>
      </div>

      <v-expand-transition>
        <div v-if="isEnabled(day.value) && isExpanded(day.value)" class="wsa__drawer">
          <p v-if="!isBusinessDay(day.value)" class="wsa__note">
            <v-icon size="13" aria-hidden="true">mdi-domain</v-icon>
            El negocio no trabaja este día. Desactivalo o ajustá el marco del negocio.
          </p>

          <div v-if="getShifts(day.value).length === 0" class="wsa__empty">
            Sin turnos. Agregá el primero para este día.
          </div>

          <div
            v-for="(shift, index) in getShifts(day.value)"
            :key="`${day.value}-${index}`"
            class="wsa__shift"
          >
            <div class="wsa__range">
              <span class="wsa__range-label">Desde</span>
              <TimeRangeField
                :model-value="shift.start_time"
                :aria-label="`Hora de inicio del turno ${index + 1} de ${day.label}`"
                :invalid="!!shiftError(day.value, index)"
                @update:model-value="updateShift(day.value, index, 'start_time', $event)"
              />
              <span class="wsa__range-label">A</span>
              <TimeRangeField
                :model-value="shift.end_time"
                :aria-label="`Hora de fin del turno ${index + 1} de ${day.label}`"
                :invalid="!!shiftError(day.value, index)"
                @update:model-value="updateShift(day.value, index, 'end_time', $event)"
              />

              <button
                type="button"
                class="wsa__remove"
                :aria-label="`Eliminar turno ${index + 1} de ${day.label}`"
                @click="emit('remove-shift', day.value, index)"
              >
                <v-icon size="18" aria-hidden="true">mdi-close</v-icon>
              </button>
            </div>

            <p v-if="shiftError(day.value, index)" class="wsa__error">
              <v-icon size="12" aria-hidden="true">mdi-alert-circle-outline</v-icon>
              {{ shiftError(day.value, index) }}
            </p>
          </div>

          <div class="wsa__drawer-footer">
            <button type="button" class="wsa__add" @click="emit('add-shift', day.value)">
              <v-icon size="16" aria-hidden="true">mdi-plus</v-icon>
              Agregar turno
            </button>
          </div>
        </div>
      </v-expand-transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import TimeRangeField from './TimeRangeField.vue';
import type { BusinessDayFrame, ScheduleShiftInput } from '../types/schedule.types';

const props = withDefaults(defineProps<{
  days: { value: number; label: string }[];
  shifts: Map<number, ScheduleShiftInput[]>;
  enabled: Map<number, boolean>;
  frames?: Map<number, BusinessDayFrame>;
}>(), {
  frames: () => new Map<number, BusinessDayFrame>(),
});

const emit = defineEmits<{
  'toggle-day': [day: number, enabled: boolean];
  'add-shift': [day: number];
  'remove-shift': [day: number, index: number];
  'update-shift': [day: number, index: number, shift: ScheduleShiftInput];
  'copy-day': [day: number];
}>();

const expanded = ref<Set<number>>(new Set());

function isEnabled(day: number): boolean {
  return props.enabled.get(day) ?? false;
}

function isExpanded(day: number): boolean {
  return expanded.value.has(day);
}

function isBusinessDay(day: number): boolean {
  return props.frames.size === 0 || props.frames.has(day);
}

function getShifts(day: number): ScheduleShiftInput[] {
  return props.shifts.get(day) ?? [];
}

function onHeaderClick(day: number) {
  if (!isEnabled(day)) return;
  const next = new Set(expanded.value);
  if (next.has(day)) next.delete(day);
  else next.add(day);
  expanded.value = next;
}

function onToggle(day: number, enabled: boolean) {
  emit('toggle-day', day, enabled);
  const next = new Set(expanded.value);
  if (enabled) next.add(day);
  else next.delete(day);
  expanded.value = next;
}

function t5(value?: string | null): string {
  return (value ?? '').slice(0, 5);
}

function frameLabel(day: number): string {
  const frame = props.frames.get(day);
  if (!frame || props.frames.size === 0) return '';
  return `${format12(frame.start_time)}–${format12(frame.end_time)}`;
}

function format12(value?: string | null): string {
  const match = /^(\d{1,2}):(\d{2})/.exec(value ?? '');
  if (!match) return '—';
  const hour = Number(match[1]);
  return `${hour % 12 || 12}:${match[2]} ${hour >= 12 ? 'PM' : 'AM'}`;
}

function totalMinutes(shifts: ScheduleShiftInput[]): number {
  return shifts.reduce((total, shift) => {
    const [sh, sm] = shift.start_time.split(':').map(Number);
    const [eh, em] = shift.end_time.split(':').map(Number);
    return total + (eh * 60 + em - (sh * 60 + sm));
  }, 0);
}

function durationLabel(minutes: number): string {
  if (minutes <= 0) return '';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours} h${rest ? ` ${rest} min` : ''}`;
}

function summary(day: number): string {
  if (!isBusinessDay(day)) return 'No laborable';
  if (!isEnabled(day)) return 'Descanso';
  const shifts = getShifts(day);
  if (!shifts.length) return 'Sin turnos';
  const count = `${shifts.length} ${shifts.length === 1 ? 'turno' : 'turnos'}`;
  const duration = durationLabel(totalMinutes(shifts));
  return duration ? `${count} · ${duration}` : count;
}

function shiftError(day: number, index: number): string | null {
  const shifts = getShifts(day);
  const shift = shifts[index];
  if (!shift) return null;

  const start = t5(shift.start_time);
  const end = t5(shift.end_time);
  if (!start || !end) return 'Completá ambas horas';
  if (start >= end) return 'La hora de fin debe ser posterior al inicio';

  const frame = props.frames.get(day);
  if (frame && (start < t5(frame.start_time) || end > t5(frame.end_time))) {
    return `Fuera del marco del negocio (${format12(frame.start_time)}–${format12(frame.end_time)})`;
  }

  for (let i = 0; i < shifts.length; i += 1) {
    if (i === index) continue;
    const other = shifts[i];
    const otherStart = t5(other.start_time);
    const otherEnd = t5(other.end_time);
    if (start < otherEnd && end > otherStart) {
      return `Se superpone con el turno ${i + 1}`;
    }
  }

  return null;
}

function updateShift(day: number, index: number, field: 'start_time' | 'end_time', value: string) {
  const shifts = getShifts(day);
  const current = shifts[index];
  if (!current) return;
  emit('update-shift', day, index, { ...current, [field]: value });
}
</script>

<style scoped>
.wsa {
  border: 1px solid rgb(var(--v-theme-on-surface), 0.12);
  border-radius: 12px;
  overflow: hidden;
  background: rgb(var(--v-theme-surface));
}

.wsa__day + .wsa__day {
  border-top: 1px solid rgb(var(--v-theme-on-surface), 0.1);
}

.wsa__header {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 58px;
  padding: 6px 12px 6px 16px;
}

.wsa__header--clickable {
  cursor: pointer;
}

.wsa__header--clickable:active {
  background: rgb(var(--v-theme-on-surface), 0.035);
}

.wsa__name {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.wsa__dayname {
  font-size: 14px;
  line-height: 1.3;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
}

.wsa__summary {
  font-size: 11px;
  line-height: 1.35;
  color: rgb(var(--v-theme-on-surface), 0.52);
}

.wsa__frame {
  flex-shrink: 0;
  font-size: 10px;
  letter-spacing: 0.04em;
  color: rgb(var(--v-theme-on-surface), 0.42);
}

.wsa__controls {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 2px;
}

.wsa__switch {
  flex-shrink: 0;
}

.wsa__icon-btn,
.wsa__remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: rgb(var(--v-theme-on-surface), 0.55);
  cursor: pointer;
}

.wsa__icon-btn:active,
.wsa__remove:active {
  background: rgb(var(--v-theme-on-surface), 0.07);
}

.wsa__chevron {
  flex-shrink: 0;
  color: rgb(var(--v-theme-on-surface), 0.4);
  transition: transform 0.18s ease;
}

.wsa__chevron--open {
  transform: rotate(180deg);
}

.wsa__day--closed .wsa__dayname {
  color: rgb(var(--v-theme-on-surface), 0.55);
}

.wsa__drawer {
  padding: 0 16px 14px;
  background: rgb(var(--v-theme-on-surface), 0.018);
}

.wsa__shift {
  padding: 10px 0;
  border-top: 1px solid rgb(var(--v-theme-on-surface), 0.09);
}

.wsa__range {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 7px;
}

.wsa__range-label {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-on-surface), 0.45);
}

.wsa__remove {
  margin-left: auto;
}

.wsa__error {
  display: flex;
  align-items: center;
  gap: 5px;
  margin: 4px 0 0;
  font-size: 11px;
  line-height: 1.4;
  color: rgb(var(--v-theme-on-surface), 0.62);
}

.wsa__error .v-icon {
  color: rgb(var(--v-theme-error));
}

.wsa__note {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 2px 0 8px;
  font-size: 11px;
  line-height: 1.45;
  color: rgb(var(--v-theme-on-surface), 0.6);
}

.wsa__empty {
  padding: 10px 0;
  border-top: 1px solid rgb(var(--v-theme-on-surface), 0.09);
  font-size: 12px;
  color: rgb(var(--v-theme-on-surface), 0.55);
}

.wsa__drawer-footer {
  padding-top: 10px;
  border-top: 1px solid rgb(var(--v-theme-on-surface), 0.09);
}

.wsa__add {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  min-height: 44px;
  padding: 0 12px;
  border: 1px dashed rgb(var(--v-theme-on-surface), 0.22);
  border-radius: 8px;
  background: transparent;
  color: rgb(var(--v-theme-on-surface), 0.7);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
}

.wsa__add:active {
  background: rgb(var(--v-theme-on-surface), 0.06);
}

.wsa__menu {
  min-width: 220px;
}

@media (max-width: 699px) {
  .wsa__header {
    gap: 8px;
    padding-left: 12px;
  }

  .wsa__frame {
    display: none;
  }

  .wsa__range {
    gap: 5px;
  }

  .wsa__remove {
    margin-left: 0;
  }

  .wsa__drawer {
    padding-inline: 12px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .wsa__chevron {
    transition: none;
  }

  .wsa :deep(.v-expand-transition-enter-active),
  .wsa :deep(.v-expand-transition-leave-active) {
    transition: none !important;
  }
}
</style>
