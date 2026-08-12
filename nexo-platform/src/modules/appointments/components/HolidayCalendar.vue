<template>
  <v-card variant="flat" border>
    <v-card-text>
      <div class="d-flex align-center ga-2 mb-4 flex-wrap">
        <div class="me-2">
          <h3 class="text-subtitle-1 font-weight-medium">Excepciones</h3>
          <div class="text-caption text-medium-emphasis">
            <template v-if="isDefaultMode">
              Cierres del negocio (aplican a todos los trabajadores)
            </template>
            <template v-else>
              Días festivos o cierres puntuales del trabajador seleccionado en "Turnos de"
            </template>
          </div>
        </div>
        <v-chip
          v-if="isDefaultMode"
          variant="tonal"
          size="small"
          color="info"
          prepend-icon="mdi-domain"
        >
          Aplica a todo el negocio
        </v-chip>
        <v-btn
          color="primary"
          variant="flat"
          size="small"
          prepend-icon="mdi-plus"
          :block="$vuetify.display.xs"
          :disabled="!activeEmployeeId"
          @click="showForm = true"
        >
          Agregar Excepción
        </v-btn>
      </div>

      <div v-if="!activeEmployeeId" class="text-center text-medium-emphasis pa-6">
        Selecciona un trabajador en "Turnos de" para ver sus excepciones
      </div>

      <div v-else-if="loading" class="text-center pa-6">
        <v-progress-circular indeterminate size="32" />
      </div>

      <div v-else-if="holidays.length === 0" class="text-center text-medium-emphasis pa-6">
        <v-icon size="48" color="medium-emphasis">mdi-calendar-blank</v-icon>
        <p class="text-body-2 mt-2">
          {{ isDefaultMode ? 'No hay cierres para todo el negocio' : 'No hay excepciones para este trabajador' }}
        </p>
      </div>

      <div v-else class="d-flex flex-column ga-4">
        <div v-for="group in groupedHolidays" :key="group.key">
          <div class="text-caption font-weight-medium text-medium-emphasis mb-1 text-capitalize">
            {{ group.month }}
          </div>
          <v-list lines="two" density="compact">
            <v-list-item
              v-for="holiday in group.items"
              :key="holiday.id"
              :title="formatDate(holiday.date)"
              :subtitle="holiday.reason || (holiday.is_closed ? 'Cerrado todo el día' : `${formatTime(holiday.start_time)} - ${formatTime(holiday.end_time)}`)"
            >
              <template #prepend>
                <v-icon :color="holiday.is_closed ? 'error' : 'warning'">
                  {{ holiday.is_closed ? 'mdi-close-circle' : 'mdi-clock-outline' }}
                </v-icon>
              </template>
              <template #append>
                <v-chip
                  v-if="holiday.employee_id === null"
                  variant="tonal"
                  size="x-small"
                  color="info"
                >
                  Global
                </v-chip>
                <v-btn
                  v-if="canDelete(holiday)"
                  icon="mdi-delete"
                  size="small"
                  variant="text"
                  color="error"
                  class="ms-1"
                  @click="onDelete(holiday)"
                />
              </template>
            </v-list-item>
          </v-list>
        </div>
      </div>
    </v-card-text>

    <v-dialog
      v-model="showForm"
      max-width="420"
      :fullscreen="$vuetify.display.smAndDown"
    >
      <v-card class="d-flex flex-column">
        <v-card-title class="text-h6 d-flex align-center">
          Nueva Excepción
          <v-spacer />
          <v-btn
            icon="mdi-close"
            size="small"
            variant="text"
            aria-label="Cerrar"
            @click="showForm = false"
          />
        </v-card-title>
        <v-card-text class="flex-grow-1 overflow-y-auto">
          <v-date-picker
            v-model="form.date"
            show-adjacent-months
            class="mb-3"
          />
          <v-switch
            v-model="form.is_closed"
            label="Cerrado todo el día"
            color="error"
            class="mb-2"
            hide-details
          />
          <template v-if="!form.is_closed">
            <v-row class="mt-2">
              <v-col cols="12" sm="6">
                <v-text-field v-model="form.start_time" label="Hora inicio" type="time" />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field v-model="form.end_time" label="Hora fin" type="time" />
              </v-col>
            </v-row>
          </template>
          <v-text-field v-model="form.reason" label="Motivo (opcional)" class="mt-2" />
        </v-card-text>
        <v-card-actions class="pa-4 pt-0 d-flex ga-2">
          <v-spacer class="hidden-xs-only" />
          <v-btn variant="text" :block="$vuetify.display.xs" @click="showForm = false">
            Cancelar
          </v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :block="$vuetify.display.xs"
            :loading="saving"
            :disabled="!form.date"
            @click="onCreate"
          >
            Crear
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue';
import { useScheduleStore } from '../stores/schedule.store';
import { useNotification } from '@/shared/composables/useNotification';
import { useConfirm } from '@/shared/composables/useConfirm';
import { useAuthStore } from '@/shared/stores/auth.store';
import { DEFAULT_SCHEDULE_ID } from '../types/schedule.types';
import type { HolidayException } from '../types/schedule.types';

const scheduleStore = useScheduleStore();
const notification = useNotification();
const authStore = useAuthStore();
const { confirm } = useConfirm();

const showForm = ref(false);
const saving = ref(false);

const activeEmployeeId = computed(() => scheduleStore.activeEmployeeId);
const isDefaultMode = computed(() => activeEmployeeId.value === DEFAULT_SCHEDULE_ID);
const isEmployeeView = computed(() => authStore.userRole === 'employee');
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
  const ok = await confirm(`¿Eliminar la excepción del ${formatDate(holiday.date)}?`);
  if (!ok) return;
  try {
    await scheduleStore.deleteHoliday(holiday.id);
    notification.success('Excepción eliminada');
  } catch {
    notification.error('Error al eliminar');
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatMonth(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-MX', {
    month: 'long',
    year: 'numeric',
  });
}

function formatTime(t: string | null): string {
  return (t ?? '').slice(0, 5);
}
</script>
