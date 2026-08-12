<template>
  <v-card variant="flat" border>
    <v-card-text>
      <div class="d-flex align-center ga-2 mb-4 flex-wrap">
        <div class="me-2">
          <h3 class="text-subtitle-1 font-weight-medium">Excepciones por Trabajador</h3>
          <div class="text-caption text-medium-emphasis">
            Días festivos o cierres puntuales de cada trabajador
          </div>
        </div>
        <EmployeeSelect
          :model-value="selectedEmployeeId"
          label="Excepciones de"
          class="flex-grow-1"
          style="max-width: 320px"
          :allowed-ids="allowedIds"
          :include-default="!isEmployeeView"
          :disabled="isEmployeeView"
          @update:model-value="onEmployeeChange"
        />
        <v-chip
          v-if="selectedEmployeeId === DEFAULT_SCHEDULE_ID"
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
          :disabled="!selectedEmployeeId"
          @click="showForm = true"
        >
          Agregar Excepción
        </v-btn>
      </div>

      <div v-if="!selectedEmployeeId" class="text-center text-medium-emphasis pa-6">
        <template v-if="isEmployeeView && !myEmployeeId">
          No hay un perfil de empleado vinculado a tu cuenta. Contacta a un administrador.
        </template>
        <template v-else>
          Selecciona un trabajador para ver sus excepciones
        </template>
      </div>

      <div v-else-if="loading" class="text-center pa-6">
        <v-progress-circular indeterminate size="32" />
      </div>

      <div v-else-if="holidays.length === 0" class="text-center text-medium-emphasis pa-6">
        <v-icon size="48" color="medium-emphasis">mdi-calendar-blank</v-icon>
        <p class="text-body-2 mt-2">No hay excepciones configuradas para este trabajador</p>
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
                <v-btn
                  icon="mdi-delete"
                  size="small"
                  variant="text"
                  color="error"
                  @click="onDelete(holiday)"
                />
              </template>
            </v-list-item>
          </v-list>
        </div>
      </div>
    </v-card-text>

    <v-dialog v-model="showForm" max-width="420">
      <v-card>
        <v-card-title class="text-h6">Nueva Excepción</v-card-title>
        <v-card-text>
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
        <v-card-actions class="pa-4 pt-0">
          <v-spacer />
          <v-btn variant="text" @click="showForm = false">Cancelar</v-btn>
          <v-btn
            color="primary"
            variant="flat"
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
import { ref, reactive, computed, watch, onMounted } from 'vue';
import { useScheduleStore } from '../stores/schedule.store';
import { useNotification } from '@/shared/composables/useNotification';
import { useConfirm } from '@/shared/composables/useConfirm';
import { useAuthStore } from '@/shared/stores/auth.store';
import { useEmployeeStore } from '../stores/employee.store';
import EmployeeSelect from './EmployeeSelect.vue';
import { DEFAULT_SCHEDULE_ID } from '../types/schedule.types';
import type { HolidayException } from '../types/schedule.types';

const scheduleStore = useScheduleStore();
const notification = useNotification();
const authStore = useAuthStore();
const employeeStore = useEmployeeStore();
const { confirm } = useConfirm();

const selectedEmployeeId = ref<string | null>(null);
const myEmployeeId = ref<string | null>(null);
const showForm = ref(false);
const saving = ref(false);

const isEmployeeView = computed(() => authStore.userRole === 'employee');

const allowedIds = computed(() =>
  isEmployeeView.value && myEmployeeId.value ? [myEmployeeId.value] : undefined,
);

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

async function load() {
  await scheduleStore.fetchHolidays(resolveEmployeeId(selectedEmployeeId.value));
}

onMounted(async () => {
  await employeeStore.fetchEmployeesWithRoles();
  if (isEmployeeView.value) {
    const userId = authStore.user?.id;
    const match = employeeStore.employees.find(
      (e) => e.user_id === userId || e.supabase_user_id === userId,
    );
    myEmployeeId.value = match?.id ?? null;
    if (myEmployeeId.value) {
      selectedEmployeeId.value = myEmployeeId.value;
    }
  } else {
    selectedEmployeeId.value = DEFAULT_SCHEDULE_ID;
  }
});

async function onEmployeeChange(id: string | null) {
  selectedEmployeeId.value = id;
}

watch(selectedEmployeeId, async (id) => {
  if (!id) {
    scheduleStore.holidays = [];
    return;
  }
  await load();
});

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
      resolveEmployeeId(selectedEmployeeId.value),
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
