<template>
  <section class="hc">
    <header class="hc__head">
      <div class="hc__headings">
        <span class="ws-eyebrow">Excepciones</span>
        <h2 class="ws-section-title">
          {{ isDefaultMode ? 'Cierres del negocio' : 'Excepciones del trabajador' }}
        </h2>
        <p class="ws-section-sub">
          <template v-if="isDefaultMode">
            Días festivos o cierres puntuales que aplican a todo el equipo.
          </template>
          <template v-else>
            Días festivos o cierres puntuales del trabajador seleccionado en “Turnos de”.
          </template>
        </p>
      </div>

      <div class="hc__actions">
        <span v-if="isDefaultMode" class="hc__scope">
          <v-icon size="13" aria-hidden="true">mdi-domain</v-icon>
          Todo el negocio
        </span>
        <v-btn
          class="ws-secondary"
          variant="text"
          :disabled="!activeEmployeeId"
          @click="showForm = true"
        >
          <v-icon start size="16">mdi-plus</v-icon>
          Agregar excepción
        </v-btn>
      </div>
    </header>

    <div v-if="!activeEmployeeId" class="hc__empty">
      <v-icon size="20" aria-hidden="true">mdi-account-arrow-right-outline</v-icon>
      <span>Seleccioná un trabajador en “Turnos de” para ver sus excepciones.</span>
    </div>

    <div v-else-if="loading" class="hc__loading">
      <v-progress-circular indeterminate size="24" color="on-surface" />
    </div>

    <div v-else-if="holidays.length === 0" class="hc__empty">
      <v-icon size="20" aria-hidden="true">mdi-calendar-blank-outline</v-icon>
      <span>
        {{ isDefaultMode ? 'No hay cierres para todo el negocio.' : 'No hay excepciones para este trabajador.' }}
      </span>
    </div>

    <div v-else class="hc__groups">
      <div v-for="group in groupedHolidays" :key="group.key" class="hc__group">
        <div class="hc__group-label">{{ group.month }}</div>

        <div class="hc__rows">
          <div v-for="holiday in group.items" :key="holiday.id" class="hc__row">
            <span
              class="hc__state"
              :class="holiday.is_closed ? 'hc__state--closed' : 'hc__state--partial'"
              aria-hidden="true"
            >
              <v-icon size="15">
                {{ holiday.is_closed ? 'mdi-close-circle-outline' : 'mdi-clock-outline' }}
              </v-icon>
            </span>

            <div class="hc__main">
              <span class="hc__date">{{ formatDate(holiday.date) }}</span>
              <span class="hc__reason">
                {{ holiday.reason || (holiday.is_closed ? 'Cerrado todo el día' : `${formatTime12(holiday.start_time)} a ${formatTime12(holiday.end_time)}`) }}
              </span>
            </div>

            <span class="hc__status">
              <span
                class="ws-dot"
                :class="holiday.is_closed ? 'ws-dot--error' : 'ws-dot--warning'"
                aria-hidden="true"
              />
              {{ holiday.is_closed ? 'Cerrado' : 'Parcial' }}
            </span>

            <span v-if="holiday.employee_id === null && !isDefaultMode" class="hc__tag">
              Global
            </span>

            <v-btn
              v-if="canDelete(holiday)"
              icon
              size="small"
              variant="text"
              aria-label="Eliminar excepción"
              class="hc__remove"
              @click="onDelete(holiday)"
            >
              <v-icon size="18">mdi-delete-outline</v-icon>
            </v-btn>
          </div>
        </div>
      </div>
    </div>

    <DetailDialog
      :visible="showForm"
      title="Nueva excepción"
      :meta="isDefaultMode ? 'Aplica a todo el negocio' : 'Aplica solo al trabajador seleccionado'"
      :width="460"
      @close="showForm = false"
    >
      <div class="ws-dialog-body">
        <div class="hc__picker-wrap">
          <v-date-picker
            v-model="form.date"
            show-adjacent-months
            class="hc__picker"
          />
        </div>

        <div class="hc__closed-row">
          <span class="hc__field-label">Cerrado todo el día</span>
          <v-switch
            v-model="form.is_closed"
            color="on-surface"
            density="compact"
            hide-details
            class="ws-switch"
            aria-label="Cerrado todo el día"
          />
        </div>

        <div v-if="!form.is_closed" class="hc__partial">
          <div class="hc__partial-field">
            <span class="hc__field-label">Desde</span>
            <TimeRangeField
              v-model="form.start_time"
              aria-label="Hora de inicio de la excepción"
            />
          </div>
          <div class="hc__partial-field">
            <span class="hc__field-label">A</span>
            <TimeRangeField
              v-model="form.end_time"
              aria-label="Hora de fin de la excepción"
            />
          </div>
        </div>

        <v-text-field
          v-model="form.reason"
          label="Motivo (opcional)"
          density="compact"
          class="ws-field hc__reason-field"
        />
      </div>

      <div class="ws-dialog-footer">
        <v-btn variant="text" class="ws-secondary" @click="showForm = false">Cancelar</v-btn>
        <v-btn
          class="ws-cta"
          :loading="saving"
          :disabled="!form.date"
          @click="onCreate"
        >
          Crear excepción
        </v-btn>
      </div>
    </DetailDialog>
  </section>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue';
import { useScheduleStore } from '../stores/schedule.store';
import { useNotification } from '@/shared/composables/useNotification';
import { useConfirm } from '@/shared/composables/useConfirm';
import { useAuthStore } from '@/shared/stores/auth.store';
import { useWorkspaceStore } from '@/shared/stores/workspace.store';
import TimeRangeField from './TimeRangeField.vue';
import DetailDialog from './DetailDialog.vue';
import { DEFAULT_SCHEDULE_ID } from '../types/schedule.types';
import type { HolidayException } from '../types/schedule.types';

const scheduleStore = useScheduleStore();
const notification = useNotification();
const authStore = useAuthStore();
const workspaceStore = useWorkspaceStore();
const { confirm } = useConfirm();

const showForm = ref(false);
const saving = ref(false);

const activeEmployeeId = computed(() => scheduleStore.activeEmployeeId);
const isDefaultMode = computed(() => activeEmployeeId.value === DEFAULT_SCHEDULE_ID);
// Vista "propia": Modo Trabajo o empleado puro — solo sus propias excepciones
const isEmployeeView = computed(() => workspaceStore.isWorkMode || authStore.userRole === 'employee');
const loading = computed(() => scheduleStore.loading);

const form = reactive({
  date: '',
  is_closed: true,
  start_time: '09:00',
  end_time: '18:00',
  reason: '',
});

const holidays = computed(() => scheduleStore.holidays);

interface HolidayGroup {
  key: string;
  month: string;
  items: HolidayException[];
}

const groupedHolidays = computed<HolidayGroup[]>(() => {
  const sorted = [...holidays.value].sort((a, b) => a.date.localeCompare(b.date));
  const groups: HolidayGroup[] = [];
  for (const h of sorted) {
    const key = h.date.slice(0, 7);
    let group = groups.find((g) => g.key === key);
    if (!group) {
      group = { key, month: formatMonth(h.date), items: [] };
      groups.push(group);
    }
    group.items.push(h);
  }
  return groups;
});

function resolveEmployeeId(id: string | null): string | null {
  return id === DEFAULT_SCHEDULE_ID ? null : id;
}

function canDelete(holiday: HolidayException): boolean {
  if (isEmployeeView.value && holiday.employee_id === null) return false;
  return true;
}

watch(
  activeEmployeeId,
  async (id) => {
    if (!id) {
      scheduleStore.holidays = [];
      return;
    }
    await scheduleStore.fetchHolidays(resolveEmployeeId(id));
  },
  { immediate: true },
);

async function onCreate() {
  if (!form.date) return;
  if (!form.is_closed && form.start_time >= form.end_time) {
    notification.error('La hora de fin debe ser posterior al inicio');
    return;
  }
  saving.value = true;
  try {
    await scheduleStore.createHoliday(
      {
        date: form.date,
        is_closed: form.is_closed,
        start_time: form.is_closed ? undefined : form.start_time,
        end_time: form.is_closed ? undefined : form.end_time,
        reason: form.reason || undefined,
      },
      resolveEmployeeId(activeEmployeeId.value),
    );
    showForm.value = false;
    form.date = '';
    form.is_closed = true;
    form.reason = '';
    notification.success('Excepción creada');
  } catch {
    notification.error('Error al crear excepción');
  } finally {
    saving.value = false;
  }
}

async function onDelete(holiday: HolidayException) {
  const ok = await confirm(`¿Eliminar la excepción del ${formatDate(holiday.date)}?`, 'Eliminar excepción', {
    danger: true,
    confirmText: 'Eliminar',
  });
  if (!ok) return;
  try {
    await scheduleStore.deleteHoliday(holiday.id);
    notification.success('Excepción eliminada');
  } catch {
    notification.error('Error al eliminar');
  }
}

function formatDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatMonth(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('es-MX', {
    month: 'long',
    year: 'numeric',
  });
}

function formatTime12(time: string | null): string {
  if (!time) return '—';
  const [h, m] = time.split(':').map(Number);
  if (Number.isNaN(h)) return '—';
  const suffix = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m || 0).padStart(2, '0')} ${suffix}`;
}
</script>

<style scoped>
.hc {
  width: 100%;
  max-width: 640px;
  margin-inline: auto;
  border: 1px solid rgb(var(--v-theme-on-surface), 0.12);
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
  overflow: hidden;
}

.hc__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  padding: 18px 20px 12px;
}

.hc__headings {
  min-width: 0;
}

.hc__actions {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.hc__scope {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-on-surface), 0.5);
}

.hc__loading {
  display: flex;
  justify-content: center;
  padding: 32px 20px;
}

.hc__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 30px 20px;
  border-top: 1px solid rgb(var(--v-theme-on-surface), 0.1);
  font-size: 12px;
  line-height: 1.5;
  color: rgb(var(--v-theme-on-surface), 0.52);
}

.hc__groups {
  border-top: 1px solid rgb(var(--v-theme-on-surface), 0.1);
}

.hc__group {
  padding: 10px 20px 6px;
}

.hc__group + .hc__group {
  border-top: 1px solid rgb(var(--v-theme-on-surface), 0.1);
}

.hc__group-label {
  padding-bottom: 4px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-on-surface), 0.42);
}

.hc__row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 56px;
  padding: 4px 0;
}

.hc__row + .hc__row {
  border-top: 1px solid rgb(var(--v-theme-on-surface), 0.08);
}

.hc__state {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  color: rgb(var(--v-theme-on-surface), 0.5);
  background: rgb(var(--v-theme-on-surface), 0.045);
}

.hc__state--closed .v-icon {
  color: rgb(var(--v-theme-error), 0.85);
}

.hc__state--partial .v-icon {
  color: rgb(var(--v-theme-warning), 0.9);
}

.hc__main {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.hc__date {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  line-height: 1.3;
  font-weight: 600;
  text-transform: capitalize;
  color: rgb(var(--v-theme-on-surface));
}

.hc__reason {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
  line-height: 1.4;
  color: rgb(var(--v-theme-on-surface), 0.52);
}

.hc__status {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-on-surface), 0.5);
}

.hc__tag {
  flex-shrink: 0;
  padding: 2px 6px;
  border: 1px solid rgb(var(--v-theme-on-surface), 0.14);
  border-radius: 3px;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-on-surface), 0.5);
}

.hc__remove {
  flex-shrink: 0;
  color: rgb(var(--v-theme-on-surface), 0.45);
}

.hc__remove.v-btn {
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
}

.hc__remove.v-btn:not(:disabled):active {
  background: rgb(var(--v-theme-on-surface), 0.08);
}

.hc__picker-wrap {
  display: flex;
  justify-content: center;
  margin-bottom: 4px;
}

.hc__picker {
  max-width: 100%;
}

.hc__closed-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 48px;
  padding: 2px 0;
  border-top: 1px solid rgb(var(--v-theme-on-surface), 0.1);
}

.hc__field-label {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-on-surface), 0.48);
}

.hc__partial {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  padding: 8px 0 4px;
}

.hc__partial-field {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.hc__reason-field {
  margin-top: 14px;
}

@media (max-width: 699px) {
  .hc__head {
    flex-direction: column;
    gap: 8px;
    padding: 16px 14px 10px;
  }

  .hc__actions {
    justify-content: flex-start;
  }

  .hc__group {
    padding-left: 14px;
    padding-right: 10px;
  }

  .hc__status {
    display: none;
  }
}

@media (max-width: 479px) {
  .hc__tag {
    display: none;
  }
}
</style>
