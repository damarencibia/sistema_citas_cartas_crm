<template>
  <v-card variant="flat" border>
    <v-card-text>
      <div class="d-flex align-center justify-space-between flex-wrap ga-2 mb-2">
        <div>
          <h3 class="text-subtitle-1 font-weight-medium">
            <v-icon size="18" class="mr-1" color="primary">mdi-domain</v-icon>
            Horario del Negocio
          </h3>
          <div class="text-caption text-medium-emphasis">
            Marco global: días laborables y apertura/cierre. Los trabajadores configuran
            sus turnos dentro de este marco.
          </div>
        </div>
        <v-chip v-if="dirty" color="warning" size="small">
          <v-icon start size="16">mdi-alert-outline</v-icon>
          Sin guardar
        </v-chip>
      </div>

      <div v-if="loading" class="text-center pa-8">
        <v-progress-circular indeterminate color="primary" />
      </div>

      <template v-else>
        <v-row dense>
          <v-col
            v-for="day in days"
            :key="day.value"
            cols="12"
            sm="6"
            md="4"
          >
            <v-card
              variant="outlined"
              rounded="lg"
              :class="day.active ? 'business-day--active' : ''"
            >
              <v-card-text class="pa-3">
                <v-switch
                  :model-value="day.active"
                  color="primary"
                  density="compact"
                  hide-details
                  class="mt-0"
                  @update:model-value="(v: boolean | null) => onDayToggle(day, !!v)"
                >
                  <template #label>
                    <span class="text-body-2 font-weight-medium">{{ day.label }}</span>
                  </template>
                </v-switch>

                <div v-if="day.active" class="d-flex align-center ga-2 mt-2">
                  <v-text-field
                    v-model="day.open"
                    type="time"
                    label="Apertura"
                    density="compact"
                    hide-details
                    style="max-width: 130px;"
                    @update:model-value="dirty = true"
                  />
                  <span class="text-caption text-medium-emphasis">—</span>
                  <v-text-field
                    v-model="day.close"
                    type="time"
                    label="Cierre"
                    density="compact"
                    hide-details
                    style="max-width: 130px;"
                    @update:model-value="dirty = true"
                  />
                </div>
                <div v-else class="text-caption text-medium-emphasis mt-1">
                  El negocio no trabaja este día
                </div>
                <div v-if="day.error" class="text-caption text-error mt-1">
                  {{ day.error }}
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <div class="d-flex mt-4 ga-2 justify-end">
          <v-btn
            v-if="dirty"
            variant="text"
            color="error"
            @click="discard"
          >
            Descartar
          </v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :loading="saving"
            @click="onSave"
          >
            <v-icon start>mdi-content-save</v-icon>
            {{ dirty ? 'Guardar cambios' : 'Guardar' }}
          </v-btn>
        </div>
      </template>
    </v-card-text>
  </v-card>

  <!-- Feriados del negocio -->
  <v-card variant="flat" border class="mt-6">
    <v-card-text>
      <div class="d-flex align-center justify-space-between flex-wrap ga-2 mb-2">
        <div>
          <h3 class="text-subtitle-1 font-weight-medium">
            <v-icon size="18" class="mr-1" color="error">mdi-calendar-remove-outline</v-icon>
            Feriados del Negocio
          </h3>
          <div class="text-caption text-medium-emphasis">
            Días en los que el negocio está cerrado para todos los trabajadores
          </div>
        </div>
        <v-btn
          size="small"
          variant="tonal"
          color="error"
          prepend-icon="mdi-plus"
          @click="showHolidayDialog = true"
        >
          Agregar feriado
        </v-btn>
      </div>

      <v-list density="compact">
        <v-list-item
          v-for="h in holidays"
          :key="h.id"
          :title="formatDate(h.date)"
          :subtitle="holidaySubtitle(h)"
        >
          <template #append>
            <v-btn
              size="small"
              icon="mdi-delete-outline"
              variant="text"
              color="error"
              title="Eliminar feriado"
              @click="onDeleteHoliday(h)"
            />
          </template>
        </v-list-item>
      </v-list>

      <div v-if="holidays.length === 0" class="text-center text-medium-emphasis pa-4">
        No hay feriados registrados
      </div>
    </v-card-text>
  </v-card>

  <v-dialog
    :model-value="showHolidayDialog"
    max-width="420"
    @update:model-value="showHolidayDialog = false"
  >
    <v-card>
      <v-card-title class="text-h6">Nuevo feriado del negocio</v-card-title>
      <v-card-text>
        <v-text-field
          v-model="holidayForm.date"
          type="date"
          label="Fecha"
          density="compact"
          class="mb-2"
        />
        <v-text-field
          v-model="holidayForm.reason"
          label="Motivo (opcional)"
          density="compact"
        />
      </v-card-text>
      <v-card-actions class="pa-4 pt-0">
        <v-spacer />
        <v-btn variant="text" @click="showHolidayDialog = false">Cancelar</v-btn>
        <v-btn
          color="primary"
          variant="flat"
          :loading="holidaySaving"
          :disabled="!holidayForm.date"
          @click="onCreateHoliday"
        >
          Crear
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { scheduleRepository } from '../repositories/schedule.repository';
import { useNotification } from '@/shared/composables/useNotification';
import { useConfirm } from '@/shared/composables/useConfirm';
import { useAuthStore } from '@/shared/stores/auth.store';
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
  // Heredado de las filas globales "por defecto" anteriores (config de citas)
  slot_mode: 'fixed' | 'flexible';
  slot_interval_minutes: number;
  advance_booking_days: number;
  min_advance_minutes: number;
  auto_confirm: boolean;
  error: string;
}

const days = reactive<BusinessDay[]>([
  { value: 1, label: 'Lunes', active: false, open: '09:00', close: '17:00', slot_mode: 'fixed', slot_interval_minutes: 30, advance_booking_days: 7, min_advance_minutes: 15, auto_confirm: true, error: '' },
  { value: 2, label: 'Martes', active: false, open: '09:00', close: '17:00', slot_mode: 'fixed', slot_interval_minutes: 30, advance_booking_days: 7, min_advance_minutes: 15, auto_confirm: true, error: '' },
  { value: 3, label: 'Miércoles', active: false, open: '09:00', close: '17:00', slot_mode: 'fixed', slot_interval_minutes: 30, advance_booking_days: 7, min_advance_minutes: 15, auto_confirm: true, error: '' },
  { value: 4, label: 'Jueves', active: false, open: '09:00', close: '17:00', slot_mode: 'fixed', slot_interval_minutes: 30, advance_booking_days: 7, min_advance_minutes: 15, auto_confirm: true, error: '' },
  { value: 5, label: 'Viernes', active: false, open: '09:00', close: '17:00', slot_mode: 'fixed', slot_interval_minutes: 30, advance_booking_days: 7, min_advance_minutes: 15, auto_confirm: true, error: '' },
  { value: 6, label: 'Sábado', active: false, open: '09:00', close: '17:00', slot_mode: 'fixed', slot_interval_minutes: 30, advance_booking_days: 7, min_advance_minutes: 15, auto_confirm: true, error: '' },
  { value: 0, label: 'Domingo', active: false, open: '09:00', close: '17:00', slot_mode: 'fixed', slot_interval_minutes: 30, advance_booking_days: 7, min_advance_minutes: 15, auto_confirm: true, error: '' },
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
    d.slot_mode = 'fixed';
    d.slot_interval_minutes = 30;
    d.advance_booking_days = 7;
    d.min_advance_minutes = 15;
    d.auto_confirm = true;
    d.error = '';
  }
  for (const row of rows) {
    if (!row.is_active) continue;
    let day = days.find((d) => d.value === row.day_of_week);
    if (!day) continue;
    if (!day.active) {
      day.active = true;
      day.open = row.start_time.slice(0, 5);
      day.close = row.end_time.slice(0, 5);
      day.slot_mode = row.slot_mode ?? 'fixed';
      day.slot_interval_minutes = row.slot_interval_minutes ?? 30;
      day.advance_booking_days = row.advance_booking_days ?? 7;
      day.min_advance_minutes = row.min_advance_minutes ?? 15;
      day.auto_confirm = row.auto_confirm ?? true;
    } else {
      // Consolidación de filas huérfanas: marco = min apertura / max cierre,
      // config heredada de la fila con apertura más temprana.
      if (row.start_time.slice(0, 5) < day.open) {
        day.open = row.start_time.slice(0, 5);
        day.slot_mode = row.slot_mode ?? 'fixed';
        day.slot_interval_minutes = row.slot_interval_minutes ?? 30;
        day.advance_booking_days = row.advance_booking_days ?? 7;
        day.min_advance_minutes = row.min_advance_minutes ?? 15;
        day.auto_confirm = row.auto_confirm ?? true;
      }
      if (row.end_time.slice(0, 5) > day.close) {
        day.close = row.end_time.slice(0, 5);
      }
    }
  }
  days.sort((a, b) => a.value - b.value);
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
    notification.error('Revisa las horas de los días marcados');
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
        slot_mode: d.slot_mode,
        slot_interval_minutes: d.slot_interval_minutes,
        advance_booking_days: d.advance_booking_days,
        min_advance_minutes: d.min_advance_minutes,
        auto_confirm: d.auto_confirm,
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
  const ok = await confirm(`¿Eliminar el feriado del ${formatDate(h.date)}?`);
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

function holidaySubtitle(h: HolidayException): string {
  return h.reason || 'Todo el día cerrado';
}
</script>

<style scoped>
.business-day--active {
  border-color: rgb(var(--v-theme-primary)) !important;
}
</style>
