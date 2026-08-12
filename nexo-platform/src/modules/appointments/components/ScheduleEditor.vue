<template>
  <div class="schedule-editor">
    <v-card variant="flat" border>
      <v-card-text>
        <div class="d-flex align-center ga-2 mb-4 flex-wrap">
          <div class="me-2">
            <h3 class="text-subtitle-1 font-weight-medium">Turnos Semanales</h3>
            <div class="text-caption text-medium-emphasis">Horario recurrente de citas</div>
          </div>
          <EmployeeSelect
            :model-value="selectedEmployeeId"
            label="Turnos de"
            class="flex-grow-1"
            :style="$vuetify.display.xs ? undefined : { maxWidth: '320px' }"
            :allowed-ids="allowedIds"
            :include-default="!isEmployeeView"
            :disabled="isEmployeeView"
            @update:model-value="onEmployeeChange"
          />
          <v-chip
            v-if="isEmployeeView"
            color="primary"
            variant="tonal"
            size="small"
          >
            <v-icon start size="16">mdi-account-badge-outline</v-icon>
            Configurando tu horario
          </v-chip>
          <v-chip v-if="dirty" color="warning" size="small">
            <v-icon start size="16">mdi-alert-outline</v-icon>
            Sin guardar
          </v-chip>
          <v-btn
            v-if="!isEmployeeView && selectedEmployeeId"
            size="small"
            variant="tonal"
            prepend-icon="mdi-content-copy"
            @click="openCopyDialog"
          >
            Copiar a empleado
          </v-btn>
        </div>

        <div v-if="!selectedEmployeeId" class="text-center text-medium-emphasis pa-8">
          <template v-if="isEmployeeView && !myEmployeeId">
            No hay un perfil de empleado vinculado a tu cuenta. Contacta a un administrador.
          </template>
          <template v-else>
            Selecciona un empleado para configurar sus turnos
          </template>
        </div>

        <template v-else>
          <div class="d-flex ga-2 mb-3 flex-wrap">
            <v-chip variant="tonal" size="small" prepend-icon="mdi-calendar-week">
              {{ summary.days }} días activos
            </v-chip>
            <v-chip variant="tonal" size="small" prepend-icon="mdi-clock-outline">
              {{ summary.hours }} semanales
            </v-chip>
            <v-chip
              v-if="selectedEmployeeId === DEFAULT_SCHEDULE_ID"
              variant="tonal"
              size="small"
              color="info"
              prepend-icon="mdi-domain"
            >
              Se aplica a empleados sin horario propio
            </v-chip>
          </div>

          <div class="d-flex align-center ga-1 mb-3">
            <v-switch
              v-model="autoConfirmDefault"
              label="Auto-confirmar reservas"
              color="primary"
              density="compact"
              hide-details
            />
            <v-tooltip location="top" max-width="300">
              <template #activator="{ props }">
                <v-icon v-bind="props" size="small" color="medium-emphasis">
                  mdi-information-outline
                </v-icon>
              </template>
              <span>
                Si está activo, las reservas del portal se agendan automáticamente en todos los
                turnos de este horario. Si no, quedan como Pendientes de Confirmación para aprobar.
                Puedes ajustar cada turno individualmente.
              </span>
            </v-tooltip>
          </div>

          <WeekScheduleGrid
            :days="daysOfWeek"
            :shifts="localShifts"
            @toggle-day="onToggleDay"
            @add-shift="openShiftDialog"
            @edit-shift="editShift"
            @remove-shift="removeShift"
            @copy-day="copyDayToWeek"
          />

          <div class="d-flex mt-4 ga-2" :class="$vuetify.display.xs ? 'flex-column' : 'justify-end'">
            <v-btn
              v-if="dirty"
              variant="text"
              color="error"
              :block="$vuetify.display.xs"
              @click="onDiscard"
            >
              Descartar
            </v-btn>
            <v-btn
              color="primary"
              variant="flat"
              :loading="saving"
              :block="$vuetify.display.xs"
              @click="onSave"
            >
              <v-icon start>mdi-content-save</v-icon>
              {{ dirty ? 'Guardar cambios' : 'Guardar' }}
            </v-btn>
          </div>
        </template>
      </v-card-text>
    </v-card>

    <ShiftDialog
      :visible="showShiftDialog"
      :day-label="currentDayLabel"
      :start_time="editingShift?.start_time"
      :end_time="editingShift?.end_time"
      :slot_mode="editingShift?.slot_mode"
      :slot_interval_minutes="editingShift?.slot_interval_minutes"
      :advance_booking_days="editingShift?.advance_booking_days"
      :min_advance_minutes="editingShift?.min_advance_minutes"
      :auto_confirm="editingShift?.auto_confirm"
      :existing-shifts="currentDayShiftsForValidation"
      @close="closeShiftDialog"
      @save="onShiftSave"
    />

    <v-dialog v-model="showCopyDialog" max-width="440">
      <v-card>
        <v-card-title class="text-h6">Copiar horario a otro empleado</v-card-title>
        <v-card-text>
          <p class="text-body-2 text-medium-emphasis mb-3">
            El horario actual se copiará como cambios sin guardar para el empleado
            seleccionado. Revisa y pulsa Guardar para aplicarlo.
          </p>
          <EmployeeSelect
            v-model="copyTargetId"
            label="Copiar a"
            :allowed-ids="allowedIds"
            :exclude-ids="copyExcludeIds"
            :include-default="!isEmployeeView"
          />
        </v-card-text>
        <v-card-actions class="pa-4 pt-0">
          <v-spacer />
          <v-btn variant="text" @click="showCopyDialog = false">Cancelar</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :disabled="!copyTargetId"
            @click="onCopyConfirm"
          >
            Copiar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed, onMounted } from 'vue';
import { useScheduleStore } from '../stores/schedule.store';
import { useNotification } from '@/shared/composables/useNotification';
import { useConfirm } from '@/shared/composables/useConfirm';
import { useAuthStore } from '@/shared/stores/auth.store';
import { useEmployeeStore } from '../stores/employee.store';
import EmployeeSelect from './EmployeeSelect.vue';
import ShiftDialog from './ShiftDialog.vue';
import WeekScheduleGrid from './WeekScheduleGrid.vue';
import { DEFAULT_SCHEDULE_ID } from '../types/schedule.types';
import type { ScheduleShiftInput, CreateScheduleDTO } from '../types/schedule.types';

const scheduleStore = useScheduleStore();
const notification = useNotification();
const authStore = useAuthStore();
const employeeStore = useEmployeeStore();
const { confirm } = useConfirm();

const selectedEmployeeId = computed<string | null>({
  get: () => scheduleStore.activeEmployeeId,
  set: (v) => {
    scheduleStore.activeEmployeeId = v;
  },
});
const saving = ref(false);
const dirty = ref(false);
const suppressWatch = ref(false);
const syncAutoConfirm = ref(false);
const autoConfirmDefault = ref(true);

const isEmployeeView = computed(() => authStore.userRole === 'employee');
const myEmployeeId = ref<string | null>(null);

const allowedIds = computed(() =>
  isEmployeeView.value && myEmployeeId.value ? [myEmployeeId.value] : undefined,
);

const copyExcludeIds = computed(() => {
  if (isEmployeeView.value && myEmployeeId.value) return [myEmployeeId.value];
  return selectedEmployeeId.value ? [selectedEmployeeId.value] : undefined;
});

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

function resolveEmployeeId(id: string | null): string | null {
  return id === DEFAULT_SCHEDULE_ID ? null : id;
}

const localShifts = reactive<Map<number, ScheduleShiftInput[]>>(new Map());

const daysOfWeek = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
];

function defaultShift(): ScheduleShiftInput {
  return {
    start_time: '09:00',
    end_time: '17:00',
    slot_mode: 'fixed',
    slot_interval_minutes: 30,
    advance_booking_days: 7,
    min_advance_minutes: 15,
    auto_confirm: autoConfirmDefault.value,
  };
}

function initLocalShifts() {
  localShifts.clear();
  let allAutoConfirm = true;
  let hasShifts = false;
  for (const day of daysOfWeek) {
    const daySchedules = scheduleStore.schedules.filter(
      (s) => s.day_of_week === day.value && s.is_active,
    );
    if (daySchedules.length) hasShifts = true;
    localShifts.set(
      day.value,
      daySchedules.map((s) => {
        if (s.auto_confirm === false) allAutoConfirm = false;
        return {
          start_time: s.start_time,
          end_time: s.end_time,
          slot_mode: s.slot_mode ?? 'fixed',
          slot_interval_minutes: s.slot_interval_minutes ?? 30,
          advance_booking_days: s.advance_booking_days ?? 7,
          min_advance_minutes: s.min_advance_minutes ?? 15,
          auto_confirm: s.auto_confirm ?? true,
        };
      }),
    );
  }
  syncAutoConfirm.value = true;
  autoConfirmDefault.value = !hasShifts || allAutoConfirm;
  syncAutoConfirm.value = false;
}

const summary = computed(() => {
  let days = 0;
  let minutes = 0;
  for (const [, shifts] of localShifts) {
    if (shifts.length) days += 1;
    for (const s of shifts) {
      const [sh, sm] = s.start_time.split(':').map(Number);
      const [eh, em] = s.end_time.split(':').map(Number);
      minutes += eh * 60 + em - (sh * 60 + sm);
    }
  }
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return { days, hours: `${h} h${m ? ` ${m} min` : ''}` };
});

function onToggleDay(day: number) {
  if ((localShifts.get(day) ?? []).length > 0) {
    localShifts.set(day, []);
  } else {
    localShifts.set(day, [defaultShift()]);
  }
  dirty.value = true;
}

const showShiftDialog = ref(false);
const currentEditDay = ref<number>(0);
const editingShiftIndex = ref<number>(-1);

const editingShift = computed(() => {
  if (editingShiftIndex.value < 0) return null;
  const shifts = localShifts.get(currentEditDay.value) ?? [];
  return shifts[editingShiftIndex.value] ?? null;
});

const currentDayLabel = computed(() => {
  return daysOfWeek.find((d) => d.value === currentEditDay.value)?.label ?? '';
});

const currentDayShiftsForValidation = computed(() => {
  const shifts = localShifts.get(currentEditDay.value) ?? [];
  return shifts
    .filter((_, i) => i !== editingShiftIndex.value)
    .map((s) => ({ start_time: s.start_time, end_time: s.end_time }));
});

function openShiftDialog(day: number) {
  currentEditDay.value = day;
  editingShiftIndex.value = -1;
  showShiftDialog.value = true;
}

function editShift(day: number, index: number) {
  currentEditDay.value = day;
  editingShiftIndex.value = index;
  showShiftDialog.value = true;
}

function closeShiftDialog() {
  showShiftDialog.value = false;
  editingShiftIndex.value = -1;
}

function onShiftSave(data: ScheduleShiftInput) {
  const shifts = localShifts.get(currentEditDay.value);
  if (!shifts) return;

  const shiftData: ScheduleShiftInput = {
    start_time: data.start_time,
    end_time: data.end_time,
    slot_mode: data.slot_mode ?? 'fixed',
    slot_interval_minutes: data.slot_interval_minutes ?? 30,
    advance_booking_days: data.advance_booking_days ?? 7,
    min_advance_minutes: data.min_advance_minutes ?? 15,
    auto_confirm: data.auto_confirm ?? true,
  };

  if (editingShiftIndex.value >= 0) {
    shifts[editingShiftIndex.value] = shiftData;
  } else {
    shifts.push(shiftData);
  }
  dirty.value = true;
  closeShiftDialog();
}

function removeShift(day: number, index: number) {
  const shifts = localShifts.get(day);
  if (!shifts) return;
  shifts.splice(index, 1);
  dirty.value = true;
}

function copyDayToWeek(day: number) {
  const source = localShifts.get(day) ?? [];
  for (const d of daysOfWeek) {
    localShifts.set(d.value, source.map((s) => ({ ...s })));
  }
  dirty.value = true;
  notification.info(`Horario del ${currentDayLabelFor(day)} copiado a toda la semana`);
}

function currentDayLabelFor(day: number): string {
  return daysOfWeek.find((d) => d.value === day)?.label ?? '';
}

const showCopyDialog = ref(false);
const copyTargetId = ref<string | null>(null);

function openCopyDialog() {
  copyTargetId.value = null;
  showCopyDialog.value = true;
}

async function onCopyConfirm() {
  if (!copyTargetId.value) return;
  const source = new Map<number, ScheduleShiftInput[]>();
  for (const [day, shifts] of localShifts) {
    source.set(day, shifts.map((s) => ({ ...s })));
  }
  const target = copyTargetId.value;
  showCopyDialog.value = false;

  suppressWatch.value = true;
  selectedEmployeeId.value = target;
  await scheduleStore.fetchSchedules(resolveEmployeeId(target));
  initLocalShifts();
  for (const [day, shifts] of source) {
    localShifts.set(day, shifts);
  }
  dirty.value = true;
  notification.success('Horario copiado. Revisa y pulsa Guardar.');
}

function buildPayload(): CreateScheduleDTO[] {
  const out: CreateScheduleDTO[] = [];
  for (const [day, shifts] of localShifts) {
    for (const s of shifts) {
      out.push({ day_of_week: day, ...s });
    }
  }
  return out;
}

async function onSave() {
  if (!selectedEmployeeId.value) return;
  saving.value = true;
  try {
    await scheduleStore.updateSchedules(buildPayload(), resolveEmployeeId(selectedEmployeeId.value));
    await scheduleStore.fetchSchedules(resolveEmployeeId(selectedEmployeeId.value));
    initLocalShifts();
    dirty.value = false;
    notification.success('Turnos guardados correctamente');
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '';
    if (msg.includes('Not authorized') || msg.includes('no autorizado') || msg.includes('authorized')) {
      notification.error('No tienes permiso para editar este horario');
    } else {
      notification.error('Error al guardar turnos');
    }
  } finally {
    saving.value = false;
  }
}

function onDiscard() {
  if (!dirty.value) return;
  confirm('¿Descartar los cambios sin guardar?').then((ok) => {
    if (ok) {
      initLocalShifts();
      dirty.value = false;
    }
  });
}

async function onEmployeeChange(id: string | null) {
  if (id === selectedEmployeeId.value) return;
  if (dirty.value) {
    const ok = await confirm('Tienes cambios sin guardar. ¿Descartarlos?');
    if (!ok) return;
  }
  selectedEmployeeId.value = id;
}

watch(selectedEmployeeId, async (id) => {
  if (suppressWatch.value) {
    suppressWatch.value = false;
    return;
  }
  if (!id) {
    localShifts.clear();
    dirty.value = false;
    return;
  }
  await scheduleStore.fetchSchedules(resolveEmployeeId(id));
  initLocalShifts();
  dirty.value = false;
});

watch(autoConfirmDefault, (val) => {
  if (syncAutoConfirm.value) return;
  for (const [, shifts] of localShifts) {
    for (const s of shifts) s.auto_confirm = val;
  }
  dirty.value = true;
});
</script>
