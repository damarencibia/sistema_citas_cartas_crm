<template>
  <div class="schedule-editor">
    <div class="d-flex align-center ga-2 mb-4 flex-wrap">
      <EmployeeSelect
        v-model="selectedEmployeeId"
        label="Empleado"
        class="flex-grow-1"
        :allowed-ids="allowedIds"
        :disabled="isEmployeeView"
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
      <v-card v-for="day in daysOfWeek" :key="day.value" class="mb-2">
        <v-card-text class="py-3">
          <div class="d-flex align-center ga-3">
            <v-checkbox
              :model-value="isDayActive(day.value)"
              :label="day.label"
              hide-details
              density="compact"
              @update:model-value="toggleDay(day.value)"
            />
            <v-spacer />
            <v-btn
              v-if="isDayActive(day.value)"
              size="small"
              color="primary"
              variant="tonal"
              prepend-icon="mdi-plus"
              @click="openShiftDialog(day.value)"
            >
              Agregar turno
            </v-btn>
          </div>

          <div v-if="isDayActive(day.value) && getShifts(day.value).length > 0" class="mt-2 ml-8">
            <div
              v-for="(shift, idx) in getShifts(day.value)"
              :key="`shift-${day.value}-${idx}`"
              class="d-flex align-center ga-2 mb-1"
            >
              <v-chip
                size="small"
                :color="shift.slot_mode === 'flexible' ? 'orange' : 'primary'"
                variant="tonal"
                prepend-icon="mdi-clock-outline"
              >
                {{ shift.start_time?.slice(0, 5) }} - {{ shift.end_time?.slice(0, 5) }}
                <template #append>
                  <span class="text-caption ml-1">
                    {{ shift.slot_mode === 'flexible' ? 'flex' : 'auto' }}
                  </span>
                </template>
              </v-chip>
              <v-btn
                icon="mdi-pencil"
                size="x-small"
                variant="text"
                @click="editShift(day.value, idx)"
              />
              <v-btn
                icon="mdi-delete"
                size="x-small"
                variant="text"
                color="error"
                @click="removeShift(day.value, idx)"
              />
            </div>
          </div>

          <div v-else-if="isDayActive(day.value)" class="text-caption text-medium-emphasis ml-8 mt-1">
            Sin turnos configurados
          </div>
        </v-card-text>
      </v-card>

      <div class="d-flex justify-end mt-4">
        <v-btn
          color="primary"
          variant="flat"
          :loading="saving"
          @click="onSave"
        >
          <v-icon start>mdi-content-save</v-icon>
          Guardar Horarios
        </v-btn>
      </div>
    </template>

    <ShiftDialog
      :visible="showShiftDialog"
      :day-label="currentDayLabel"
      :start_time="editingShift?.start_time"
      :end_time="editingShift?.end_time"
      :slot_mode="editingShift?.slot_mode"
      :slot_interval_minutes="editingShift?.slot_interval_minutes"
      :advance_booking_days="editingShift?.advance_booking_days"
      :min_advance_minutes="editingShift?.min_advance_minutes"
      :existing-shifts="currentDayShiftsForValidation"
      @close="closeShiftDialog"
      @save="onShiftSave"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed, onMounted } from 'vue';
import { useScheduleStore } from '../stores/schedule.store';
import { useNotification } from '@/shared/composables/useNotification';
import { useAuthStore } from '@/shared/stores/auth.store';
import { useEmployeeStore } from '../stores/employee.store';
import EmployeeSelect from './EmployeeSelect.vue';
import ShiftDialog from './ShiftDialog.vue';

const scheduleStore = useScheduleStore();
const notification = useNotification();
const authStore = useAuthStore();
const employeeStore = useEmployeeStore();

const selectedEmployeeId = ref<string | null>(null);
const saving = ref(false);

const isEmployeeView = computed(() => authStore.userRole === 'employee');
const myEmployeeId = ref<string | null>(null);

const allowedIds = computed(() =>
  isEmployeeView.value && myEmployeeId.value ? [myEmployeeId.value] : undefined,
);

onMounted(async () => {
  if (!isEmployeeView.value) return;
  await employeeStore.fetchEmployeesWithRoles();
  const userId = authStore.user?.id;
  const match = employeeStore.employees.find(
    (e) => e.user_id === userId || e.supabase_user_id === userId,
  );
  myEmployeeId.value = match?.id ?? null;
  if (myEmployeeId.value) {
    selectedEmployeeId.value = myEmployeeId.value;
  }
});

interface LocalShift {
  start_time: string;
  end_time: string;
  slot_mode: 'fixed' | 'flexible';
  slot_interval_minutes: number;
  advance_booking_days: number;
  min_advance_minutes: number;
}

const localShifts = reactive<Map<number, LocalShift[]>>(new Map());

const daysOfWeek = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
];

function initLocalShifts() {
  localShifts.clear();
  for (const day of daysOfWeek) {
    const daySchedules = scheduleStore.schedules.filter(
      (s) => s.day_of_week === day.value && s.is_active,
    );
    localShifts.set(
      day.value,
      daySchedules.map((s) => ({
        start_time: s.start_time,
        end_time: s.end_time,
        slot_mode: s.slot_mode ?? 'fixed',
        slot_interval_minutes: s.slot_interval_minutes ?? 30,
        advance_booking_days: s.advance_booking_days ?? 7,
        min_advance_minutes: s.min_advance_minutes ?? 15,
      })),
    );
  }
}

function isDayActive(day: number): boolean {
  const shifts = localShifts.get(day);
  return !!shifts && shifts.length > 0;
}

function getShifts(day: number): LocalShift[] {
  return localShifts.get(day) ?? [];
}

function toggleDay(day: number) {
  if (isDayActive(day)) {
    localShifts.set(day, []);
  } else {
    localShifts.set(day, [{
      start_time: '09:00',
      end_time: '17:00',
      slot_mode: 'fixed',
      slot_interval_minutes: 30,
      advance_booking_days: 7,
      min_advance_minutes: 15,
    }]);
  }
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

function onShiftSave(data: any) {
  const shifts = localShifts.get(currentEditDay.value);
  if (!shifts) return;

  const shiftData: LocalShift = {
    start_time: data.start_time,
    end_time: data.end_time,
    slot_mode: data.slot_mode ?? 'fixed',
    slot_interval_minutes: data.slot_interval_minutes ?? 30,
    advance_booking_days: data.advance_booking_days ?? 7,
    min_advance_minutes: data.min_advance_minutes ?? 15,
  };

  if (editingShiftIndex.value >= 0) {
    shifts[editingShiftIndex.value] = shiftData;
  } else {
    shifts.push(shiftData);
  }

  closeShiftDialog();
}

function removeShift(day: number, index: number) {
  const shifts = localShifts.get(day);
  if (!shifts) return;
  shifts.splice(index, 1);
}

async function onSave() {
  if (!selectedEmployeeId.value) return;
  saving.value = true;
  try {
    const activeShifts: any[] = [];
    for (const [day, shifts] of localShifts) {
      for (const s of shifts) {
        activeShifts.push({
          day_of_week: day,
          start_time: s.start_time,
          end_time: s.end_time,
          slot_mode: s.slot_mode,
          slot_interval_minutes: s.slot_interval_minutes,
          advance_booking_days: s.advance_booking_days,
          min_advance_minutes: s.min_advance_minutes,
        });
      }
    }
    await scheduleStore.updateSchedules(activeShifts, selectedEmployeeId.value);

    await scheduleStore.fetchSchedules(selectedEmployeeId.value);
    initLocalShifts();
    notification.success('Turnos guardados correctamente');
  } catch {
    notification.error('Error al guardar turnos');
  } finally {
    saving.value = false;
  }
}

watch(selectedEmployeeId, async (id) => {
  if (!id) {
    localShifts.clear();
    return;
  }
  await scheduleStore.fetchSchedules(id);
  initLocalShifts();
});
</script>
