<template>
  <div class="week-grid">
    <v-card
      v-for="day in days"
      :key="day.value"
      variant="outlined"
      class="day-column"
    >
      <div class="day-header">
        <v-switch
          :model-value="isActive(day.value)"
          :disabled="!isBusinessDay(day.value)"
          :title="!isBusinessDay(day.value) ? 'El negocio no trabaja este día' : undefined"
          density="compact"
          color="primary"
          hide-details
          @update:model-value="emit('toggle-day', day.value)"
        />
        <div class="day-name">
          <div class="text-caption font-weight-medium">{{ day.label }}</div>
          <div class="text-caption text-medium-emphasis">{{ summary(day.value) }}</div>
        </div>
        <v-menu location="bottom end">
          <template #activator="{ props: menuProps }">
            <v-btn
              v-bind="menuProps"
              icon="mdi-dots-vertical"
              size="x-small"
              variant="text"
            />
          </template>
          <v-list density="compact">
            <v-list-item @click="emit('copy-day', day.value)">
              <v-list-item-title class="text-caption">
                Copiar día a toda la semana
              </v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </div>

      <div class="day-body">
        <div
          v-for="(shift, idx) in getShifts(day.value)"
          :key="`shift-${day.value}-${idx}`"
          class="shift-block"
          :class="[
            shift.slot_mode === 'flexible' ? 'flexible' : 'fixed',
            isOutOfFrame(day.value, shift) ? 'out-of-frame' : '',
          ]"
          @click="emit('edit-shift', day.value, idx)"
        >
          <div class="d-flex align-center ga-1">
            <v-icon size="14">mdi-clock-outline</v-icon>
            <span class="shift-time">{{ formatTime(shift.start_time) }} – {{ formatTime(shift.end_time) }}</span>
            <v-spacer />
            <v-btn
              icon="mdi-delete"
              size="x-small"
              variant="text"
              color="error"
              class="shift-delete"
              @click.stop="emit('remove-shift', day.value, idx)"
            />
          </div>
          <div class="shift-meta">
            <span>{{ shift.slot_mode === 'flexible' ? 'flexible' : `cada ${shift.slot_interval_minutes} min` }}</span>
            <span v-if="shift.auto_confirm === false" class="auto-confirm-off">
              <v-icon size="12" color="warning">mdi-message-clock-outline</v-icon>
              pendiente
            </span>
          </div>
          <div v-if="isOutOfFrame(day.value, shift)" class="shift-warning">
            <v-icon size="12" color="error">mdi-alert-circle-outline</v-icon>
            Fuera del horario del negocio ({{ frameLabel(day.value) }})
          </div>
        </div>

        <div v-if="!isBusinessDay(day.value)" class="day-empty rest">
          El negocio no trabaja este día
        </div>
        <template v-else>
          <div v-if="getShifts(day.value).length === 0" class="day-empty">Sin turnos</div>

          <div class="pa-2">
            <v-btn
              size="x-small"
              variant="tonal"
              color="primary"
              block
              prepend-icon="mdi-plus"
              @click="emit('add-shift', day.value)"
            >
              Turno
            </v-btn>
          </div>
        </template>
      </div>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import type { BusinessDayFrame, ScheduleShiftInput } from '../types/schedule.types';

const props = withDefaults(defineProps<{
  days: { value: number; label: string }[];
  shifts: Map<number, ScheduleShiftInput[]>;
  /**
   * Marco global del negocio por día. Si está vacío, el negocio aún no ha
   * definido su horario: se permite configurar cualquier día (compatibilidad).
   */
  frames?: Map<number, BusinessDayFrame>;
}>(), {
  frames: () => new Map<number, BusinessDayFrame>(),
});

const emit = defineEmits<{
  'toggle-day': [day: number];
  'add-shift': [day: number];
  'edit-shift': [day: number, index: number];
  'remove-shift': [day: number, index: number];
  'copy-day': [day: number];
}>();

function getShifts(day: number): ScheduleShiftInput[] {
  return props.shifts.get(day) ?? [];
}

function isActive(day: number): boolean {
  return getShifts(day).length > 0;
}

function isBusinessDay(day: number): boolean {
  return props.frames.size === 0 || props.frames.has(day);
}

function frameFor(day: number): BusinessDayFrame | undefined {
  return props.frames.get(day);
}

function t5(t: string): string {
  return (t ?? '').slice(0, 5);
}

function isOutOfFrame(day: number, shift: ScheduleShiftInput): boolean {
  const frame = frameFor(day);
  if (!frame) return false;
  return t5(shift.start_time) < t5(frame.start_time) || t5(shift.end_time) > t5(frame.end_time);
}

function frameLabel(day: number): string {
  const frame = frameFor(day);
  return frame ? `${t5(frame.start_time)} – ${t5(frame.end_time)}` : '';
}

function dayMinutes(shifts: ScheduleShiftInput[]): number {
  return shifts.reduce((acc, s) => {
    const [sh, sm] = s.start_time.split(':').map(Number);
    const [eh, em] = s.end_time.split(':').map(Number);
    return acc + (eh * 60 + em - (sh * 60 + sm));
  }, 0);
}

function summary(day: number): string {
  if (!isBusinessDay(day)) return 'Cerrado';
  const min = dayMinutes(getShifts(day));
  if (min <= 0) return 'Descanso';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h} h${m ? ` ${m} min` : ''}` : `${m} min`;
}

function formatTime(t: string): string {
  return (t ?? '').slice(0, 5);
}
</script>

<style scoped>
.week-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  padding-bottom: 4px;
}

@media (max-width: 959.98px) {
  .week-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

.day-column {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

.day-column:hover {
  border-color: rgb(var(--v-border-strong, var(--v-border))) !important;
}

.day-header {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 6px 6px 10px;
  background: rgba(var(--v-theme-surface-variant), 0.4);
}

@media (max-width: 959.98px) {
  .day-header {
    padding: 10px 8px 10px 12px;
  }
}

.day-name {
  flex: 1;
  min-width: 0;
  line-height: 1.2;
}

.day-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 6px;
  background: rgb(var(--v-theme-surface));
}

.shift-block {
  border-radius: 6px;
  padding: 6px 8px;
  cursor: pointer;
  transition: filter 0.15s ease;
}

.shift-block:hover {
  filter: brightness(0.96);
}

.shift-block.fixed {
  background: rgba(var(--v-theme-primary), 0.12);
  border: 1px solid rgba(var(--v-theme-primary), 0.3);
}

.shift-block.flexible {
  background: rgba(251, 146, 60, 0.14);
  border: 1px solid rgba(251, 146, 60, 0.4);
}

.shift-block.out-of-frame {
  background: rgba(var(--v-theme-error), 0.1);
  border: 1px solid rgba(var(--v-theme-error), 0.45);
}

.shift-warning {
  display: flex;
  align-items: center;
  gap: 3px;
  margin-top: 3px;
  font-size: 11px;
  color: rgb(var(--v-theme-error));
}

.shift-time {
  font-size: 12px;
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface));
}

.shift-meta {
  font-size: 11px;
  color: rgb(var(--v-theme-medium-emphasis));
  margin-top: 2px;
}

.auto-confirm-off {
  margin-left: 8px;
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.shift-delete {
  opacity: 0.6;
}

.shift-block:hover .shift-delete {
  opacity: 1;
}

.day-empty {
  border: 1px dashed rgba(var(--v-theme-outline), 0.5);
  border-radius: 6px;
  padding: 10px 6px;
  text-align: center;
  font-size: 12px;
  color: rgb(var(--v-theme-medium-emphasis));
}

.day-empty.rest {
  border: none;
  background: rgba(var(--v-theme-surface-variant), 0.3);
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgb(var(--v-theme-medium-emphasis));
  font-size: 12px;
}
</style>
