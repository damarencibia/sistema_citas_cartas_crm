<template>
  <div class="business-hours">
    <section class="bh">
      <header class="bh__head">
        <div class="bh__headings">
          <span class="ws-eyebrow">Marco del negocio</span>
          <h2 class="ws-section-title">Horario de atención</h2>
          <p class="ws-section-sub">
            Días laborables y apertura/cierre. El equipo configura sus turnos dentro de este marco.
          </p>
        </div>
        <span v-if="dirty" class="ws-status">
          <span class="ws-dot ws-dot--warning" aria-hidden="true" />
          Sin guardar
        </span>
      </header>

      <div v-if="loading" class="bh__loading">
        <v-progress-circular indeterminate size="24" color="on-surface" />
      </div>

      <template v-else>
        <div class="bh__days">
          <div
            v-for="day in days"
            :key="day.value"
            class="bh__day"
            :class="{ 'bh__day--active': day.active }"
          >
            <div class="bh__day-head">
              <div class="bh__name">
                <span class="bh__label">{{ day.label }}</span>
                <span class="bh__summary">
                  {{ day.active ? `${format12(day.open)} a ${format12(day.close)}` : 'Cerrado' }}
                </span>
              </div>
              <v-switch
                :model-value="day.active"
                :aria-label="`Activar ${day.label}`"
                color="on-surface"
                density="compact"
                hide-details
                class="ws-switch bh__switch"
                @update:model-value="(v: boolean | null) => onDayToggle(day, !!v)"
              />
            </div>

            <div v-if="day.active" class="bh__times">
              <span class="bh__time-label">Desde</span>
              <TimeRangeField
                v-model="day.open"
                :aria-label="`Apertura del ${day.label}`"
                :invalid="!!day.error"
                @update:model-value="dirty = true"
              />
              <span class="bh__time-label">A</span>
              <TimeRangeField
                v-model="day.close"
                :aria-label="`Cierre del ${day.label}`"
                :invalid="!!day.error"
                @update:model-value="dirty = true"
              />
            </div>

            <p v-if="day.error" class="bh__error">
              <v-icon size="12" aria-hidden="true">mdi-alert-circle-outline</v-icon>
              {{ day.error }}
            </p>
          </div>
        </div>

        <footer class="bh__footer">
          <span class="bh__footer-label">
            {{ dirty ? 'Tenés cambios sin guardar' : 'Marco sincronizado' }}
          </span>
          <div class="bh__footer-actions">
            <v-btn
              v-if="dirty"
              variant="text"
              class="ws-secondary"
              @click="discard"
            >
              Descartar
            </v-btn>
            <v-btn class="ws-cta" :loading="saving" @click="onSave">
              <v-icon start size="16">mdi-content-save</v-icon>
              {{ dirty ? 'Guardar cambios' : 'Guardar' }}
            </v-btn>
          </div>
        </footer>
      </template>
    </section>

    <section class="bh">
      <header class="bh__head">
        <div class="bh__headings">
          <span class="ws-eyebrow">Cierres globales</span>
          <h2 class="ws-section-title">Feriados del negocio</h2>
          <p class="ws-section-sub">
            Días en los que el negocio está cerrado para todo el equipo.
          </p>
        </div>
        <v-btn class="ws-secondary bh__add-holiday" variant="text" @click="showHolidayDialog = true">
          <v-icon start size="16">mdi-plus</v-icon>
          Agregar feriado
        </v-btn>
      </header>

      <div v-if="holidays.length" class="bh__holidays">
        <div v-for="h in holidays" :key="h.id" class="bh__holiday">
          <div class="bh__holiday-main">
            <span class="bh__holiday-date">{{ formatDate(h.date) }}</span>
            <span class="bh__holiday-reason">{{ holidaySubtitle(h) }}</span>
          </div>
          <v-btn
            icon
            size="small"
            variant="text"
            aria-label="Eliminar feriado"
            class="bh__remove"
            @click="onDeleteHoliday(h)"
          >
            <v-icon size="18">mdi-delete-outline</v-icon>
          </v-btn>
        </div>
      </div>

      <div v-else class="bh__empty">
        <v-icon size="18" aria-hidden="true">mdi-calendar-blank-outline</v-icon>
        No hay feriados registrados.
      </div>
    </section>

    <DetailDialog
      :visible="showHolidayDialog"
      title="Nuevo feriado"
      meta="El negocio quedará cerrado para todo el equipo"
      :width="440"
      @close="showHolidayDialog = false"
    >
      <div class="ws-dialog-body">
        <v-text-field
          v-model="holidayForm.date"
          type="date"
          label="Fecha"
          density="compact"
          class="ws-field"
        />
        <v-text-field
          v-model="holidayForm.reason"
          label="Motivo (opcional)"
          density="compact"
          class="ws-field mt-3"
        />
      </div>
      <div class="ws-dialog-footer">
        <v-btn variant="text" class="ws-secondary" @click="showHolidayDialog = false">
          Cancelar
        </v-btn>
        <v-btn
          class="ws-cta"
          :loading="holidaySaving"
          :disabled="!holidayForm.date"
          @click="onCreateHoliday"
        >
          Crear feriado
        </v-btn>
      </div>
    </DetailDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { scheduleRepository } from '../repositories/schedule.repository';
import { useNotification } from '@/shared/composables/useNotification';
import { useConfirm } from '@/shared/composables/useConfirm';
import { useAuthStore } from '@/shared/stores/auth.store';
import TimeRangeField from './TimeRangeField.vue';
import DetailDialog from './DetailDialog.vue';
import type { CreateScheduleDTO, HolidayException } from '../types/schedule.types';

const authStore = useAuthStore();
const notification = useNotification();
const { confirm } = useConfirm();

const loading = ref(true);
const saving = ref(false);
const dirty = ref(false);

interface BusinessDay {
  value: number;
  label: string;
  active: boolean;
  open: string;
  close: string;
  error: string;
}

const days = reactive<BusinessDay[]>([
  { value: 1, label: 'Lunes', active: false, open: '09:00', close: '17:00', error: '' },
  { value: 2, label: 'Martes', active: false, open: '09:00', close: '17:00', error: '' },
  { value: 3, label: 'Miércoles', active: false, open: '09:00', close: '17:00', error: '' },
  { value: 4, label: 'Jueves', active: false, open: '09:00', close: '17:00', error: '' },
  { value: 5, label: 'Viernes', active: false, open: '09:00', close: '17:00', error: '' },
  { value: 6, label: 'Sábado', active: false, open: '09:00', close: '17:00', error: '' },
  { value: 0, label: 'Domingo', active: false, open: '09:00', close: '17:00', error: '' },
]);

onMounted(async () => {
  try {
    await loadDays();
  } finally {
    loading.value = false;
  }
  await fetchHolidays();
});

async function loadDays() {
  const rows = await scheduleRepository.getByEmployee(null);
  for (const d of days) {
    d.active = false;
    d.open = '09:00';
    d.close = '17:00';
    d.error = '';
  }
  for (const row of rows) {
    if (!row.is_active) continue;
    const day = days.find((d) => d.value === row.day_of_week);
    if (!day) continue;
    if (!day.active) {
      day.active = true;
      day.open = row.start_time.slice(0, 5);
      day.close = row.end_time.slice(0, 5);
    } else {
      // Consolidación de filas huérfanas: marco = min apertura / max cierre
      if (row.start_time.slice(0, 5) < day.open) {
        day.open = row.start_time.slice(0, 5);
      }
      if (row.end_time.slice(0, 5) > day.close) {
        day.close = row.end_time.slice(0, 5);
      }
    }
  }
}

function onDayToggle(day: BusinessDay, v: boolean) {
  day.active = v;
  day.error = '';
  dirty.value = true;
}

function validateDays(): boolean {
  let ok = true;
  for (const day of days) {
    day.error = '';
    if (!day.active) continue;
    if (day.open >= day.close) {
      day.error = 'La apertura debe ser anterior al cierre';
      ok = false;
    }
  }
  return ok;
}

async function onSave() {
  if (!validateDays()) {
    notification.error('Revisá las horas de los días marcados');
    return;
  }
  saving.value = true;
  try {
    const payload: CreateScheduleDTO[] = days
      .filter((d) => d.active)
      .map((d) => ({
        day_of_week: d.value,
        start_time: d.open,
        end_time: d.close,
      }));
    await scheduleRepository.replaceAll(null, payload);
    dirty.value = false;
    notification.success('Horario del negocio guardado');
  } catch {
    notification.error('Error al guardar el horario del negocio');
  } finally {
    saving.value = false;
  }
}

function discard() {
  dirty.value = false;
  loadDays();
}

// --- Feriados del negocio (estado local, filas employee_id = NULL) ---

const holidays = ref<HolidayException[]>([]);
const showHolidayDialog = ref(false);
const holidaySaving = ref(false);
const holidayForm = reactive({ date: '', reason: '' });

async function fetchHolidays() {
  const tenantId = authStore.user?.tenant_id;
  if (!tenantId) return;
  holidays.value = await scheduleRepository.getHolidays(tenantId, null);
}

async function onCreateHoliday() {
  const tenantId = authStore.user?.tenant_id;
  if (!holidayForm.date || !tenantId) return;
  holidaySaving.value = true;
  try {
    await scheduleRepository.createHoliday(tenantId, null, {
      date: holidayForm.date,
      is_closed: true,
      reason: holidayForm.reason || undefined,
    });
    showHolidayDialog.value = false;
    holidayForm.date = '';
    holidayForm.reason = '';
    await fetchHolidays();
    notification.success('Feriado creado');
  } catch {
    notification.error('Error al crear el feriado');
  } finally {
    holidaySaving.value = false;
  }
}

async function onDeleteHoliday(h: HolidayException) {
  const ok = await confirm(`¿Eliminar el feriado del ${formatDate(h.date)}?`, 'Eliminar feriado', {
    danger: true,
    confirmText: 'Eliminar',
  });
  if (!ok) return;
  try {
    await scheduleRepository.deleteHoliday(h.id);
    holidays.value = holidays.value.filter((x) => x.id !== h.id);
    notification.success('Feriado eliminado');
  } catch {
    notification.error('Error al eliminar el feriado');
  }
}

function formatDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function format12(time: string): string {
  const [h, m] = (time || '').split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m || 0).padStart(2, '0')} ${suffix}`;
}

function holidaySubtitle(h: HolidayException): string {
  return h.reason || 'Todo el día cerrado';
}
</script>

<style scoped>
.business-hours {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.bh {
  border: 1px solid rgb(var(--v-theme-on-surface), 0.12);
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
  overflow: hidden;
}

.bh__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  padding: 18px 20px 12px;
}

.bh__headings {
  min-width: 0;
}

.bh__loading {
  display: flex;
  justify-content: center;
  padding: 32px 20px;
}

.bh__days {
  border-top: 1px solid rgb(var(--v-theme-on-surface), 0.1);
}

.bh__day {
  padding: 8px 16px 10px 20px;
}

.bh__day + .bh__day {
  border-top: 1px solid rgb(var(--v-theme-on-surface), 0.08);
}

.bh__day-head {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
}

.bh__name {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.bh__label {
  font-size: 13px;
  line-height: 1.3;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
}

.bh__summary {
  font-size: 11px;
  line-height: 1.35;
  color: rgb(var(--v-theme-on-surface), 0.52);
}

.bh__switch {
  flex-shrink: 0;
}

.bh__times {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  padding: 2px 0 2px 1px;
}

.bh__time-label {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-on-surface), 0.45);
}

.bh__error {
  display: flex;
  align-items: center;
  gap: 5px;
  margin: 4px 0 0;
  font-size: 11px;
  line-height: 1.4;
  color: rgb(var(--v-theme-on-surface), 0.62);
}

.bh__error .v-icon {
  color: rgb(var(--v-theme-error));
}

.bh__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 6px;
  padding: 12px 20px calc(14px + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid rgb(var(--v-theme-on-surface), 0.1);
}

.bh__footer-label {
  font-size: 11px;
  color: rgb(var(--v-theme-on-surface), 0.5);
}

.bh__footer-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.bh__add-holiday.v-btn {
  flex-shrink: 0;
  min-height: 44px;
}

.bh__holidays {
  border-top: 1px solid rgb(var(--v-theme-on-surface), 0.1);
}

.bh__holiday {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 58px;
  padding: 6px 12px 6px 20px;
}

.bh__holiday + .bh__holiday {
  border-top: 1px solid rgb(var(--v-theme-on-surface), 0.08);
}

.bh__holiday-main {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.bh__holiday-date {
  font-size: 13px;
  line-height: 1.3;
  font-weight: 600;
  text-transform: capitalize;
  color: rgb(var(--v-theme-on-surface));
}

.bh__holiday-reason {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
  color: rgb(var(--v-theme-on-surface), 0.52);
}

.bh__remove {
  color: rgb(var(--v-theme-on-surface), 0.5);
}

.bh__remove.v-btn {
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
}

.bh__remove.v-btn:not(:disabled):active {
  background: rgb(var(--v-theme-on-surface), 0.08);
}

.bh__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 28px 20px;
  border-top: 1px solid rgb(var(--v-theme-on-surface), 0.1);
  font-size: 12px;
  color: rgb(var(--v-theme-on-surface), 0.5);
}

@media (max-width: 699px) {
  .bh__head {
    flex-direction: column;
    gap: 8px;
    padding: 16px 14px 10px;
  }

  .bh__day {
    padding-left: 14px;
    padding-right: 10px;
  }

  .bh__holiday {
    padding-left: 14px;
    padding-right: 8px;
  }

  .bh__footer {
    flex-direction: column;
    align-items: stretch;
    padding-left: 14px;
    padding-right: 14px;
  }

  .bh__footer-actions {
    justify-content: flex-end;
  }
}

@media (max-width: 479px) {
  .bh__footer-actions {
    flex-direction: column-reverse;
  }

  .bh__footer-actions .v-btn {
    width: 100%;
  }
}
</style>
