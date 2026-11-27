<template>
  <div class="schedule-editor">
    <section class="se">
      <header class="se__head">
        <div class="se__headings">
          <span class="ws-eyebrow">Horario semanal</span>
          <h2 class="ws-section-title">Turnos semanales</h2>
          <p class="ws-section-sub">
            Activá los días que trabajás y definí uno o varios turnos por día.
          </p>
        </div>

        <div class="se__badges">
          <span v-if="isEmployeeView" class="se__badge">Configurando tu horario</span>
          <span v-if="dirty" class="ws-status">
            <span class="ws-dot ws-dot--warning" aria-hidden="true" />
            Sin guardar
          </span>
        </div>
      </header>

      <div v-if="!isEmployeeView" class="se__employee-row">
        <EmployeeSelect
          :model-value="selectedEmployeeId"
          label="Turnos de"
          class="se__employee ws-field"
          :allowed-ids="allowedIds"
          :include-default="false"
          :disabled="isEmployeeView"
          @update:model-value="onEmployeeChange"
        />
        <v-btn
          v-if="!isEmployeeView && selectedEmployeeId"
          variant="text"
          class="ws-secondary se__copy-btn"
          prepend-icon="mdi-content-copy"
          @click="openCopyDialog"
        >
          Copiar a empleado
        </v-btn>
      </div>

      <div v-if="!selectedEmployeeId" class="se__empty">
        <template v-if="isEmployeeView && !myEmployeeId">
          No hay un perfil de empleado vinculado a tu cuenta. Contactá a un administrador.
        </template>
        <template v-else-if="!isEmployeeView && employeeStore.activeEmployees.length === 0">
          No hay empleados activos. Creá o activá un empleado para configurar sus turnos.
        </template>
        <template v-else>
          Seleccioná un empleado para configurar sus turnos.
        </template>
      </div>

      <template v-else>
        <div class="se__summary">
          <span class="se__stat">
            <span class="se__stat-value">{{ summary.days }}</span>
            {{ summary.days === 1 ? 'día activo' : 'días activos' }}
          </span>
          <span class="se__stat-sep" aria-hidden="true">·</span>
          <span class="se__stat">
            <span class="se__stat-value">{{ summary.hours }}</span>
            semanales
          </span>
        </div>

        <div v-if="framesLoaded && !hasBusinessFrame" class="se__note">
          <v-icon size="14" aria-hidden="true">mdi-domain</v-icon>
          <span v-if="isEmployeeView">
            El negocio aún no definió su horario global. Podés configurar tus turnos, pero cuando
            lo definan deberán quedar dentro de ese marco.
          </span>
          <span v-else>
            Aún no definiste el horario del negocio. Mientras no exista un marco global, el equipo
            puede configurar cualquier día y hora.
          </span>
        </div>

        <section v-if="isEmployeeView" class="se__policy">
          <div class="se__policy-head">
            <v-icon size="15" aria-hidden="true">mdi-calendar-clock-outline</v-icon>
            <span>Políticas de reserva</span>
          </div>
          <p class="se__policy-sub">
            Aplican a todos tus turnos y cuentan desde hoy hasta el día de la cita.
          </p>
          <div class="se__policy-grid">
            <v-text-field
              v-model.number="policy.advance_booking_days"
              label="Días máx. anticipación"
              type="number"
              :min="1"
              :max="365"
              density="compact"
              hide-details
              hint="Cuántos días adelante pueden reservar contigo"
              persistent-hint
              class="ws-field"
            />
            <v-text-field
              v-model.number="policy.min_advance_minutes"
              label="Mín. anticipación (min)"
              type="number"
              :min="0"
              :max="4320"
              density="compact"
              hide-details
              hint="Tiempo mínimo antes de la cita para reservar"
              persistent-hint
              class="ws-field"
            />
          </div>
        </section>

        <WeekScheduleAccordion
          :days="daysOfWeek"
          :shifts="localShifts"
          :enabled="dayEnabled"
          :frames="businessFrames"
          :revision="dataRevision"
          @toggle-day="onToggleDay"
          @add-shift="onAddShift"
          @remove-shift="removeShift"
          @update-shift="onUpdateShift"
          @copy-day="copyDayToWeek"
        />

        <footer class="se__footer" :class="{ 'se__footer--dirty': dirty }">
          <span class="se__footer-label">
            {{ dirty ? 'Tenés cambios sin guardar' : 'Horario sincronizado' }}
          </span>
          <div class="se__footer-actions">
            <v-btn
              v-if="dirty"
              variant="text"
              class="ws-secondary"
              @click="onDiscard"
            >
              Descartar
            </v-btn>
            <v-btn
              class="ws-cta"
              :loading="saving"
              @click="onSave"
            >
              <v-icon start size="16">mdi-content-save</v-icon>
              {{ dirty ? 'Guardar cambios' : 'Guardar' }}
            </v-btn>
          </div>
        </footer>
      </template>
    </section>

    <DetailDialog
      :visible="showCopyDialog"
      title="Copiar horario"
      meta="Se copiará como borrador para el empleado seleccionado"
      :width="480"
      @close="showCopyDialog = false"
    >
      <div class="ws-dialog-body">
        <p class="se__dialog-copy">
          El horario actual se copiará como cambios sin guardar. Revisá y pulsá Guardar para
          aplicarlo.
        </p>
        <EmployeeSelect
          v-model="copyTargetId"
          label="Copiar a"
          :allowed-ids="allowedIds"
          :exclude-ids="copyExcludeIds"
          :include-default="false"
          class="ws-field"
        />
      </div>
      <div class="ws-dialog-footer">
        <v-btn variant="text" class="ws-secondary" @click="showCopyDialog = false">Cancelar</v-btn>
        <v-btn
          class="ws-cta"
          :disabled="!copyTargetId"
          @click="onCopyConfirm"
        >
          Copiar
        </v-btn>
      </div>
    </DetailDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed, onMounted } from 'vue';
import { useScheduleStore } from '../stores/schedule.store';
import { useNotification } from '@/shared/composables/useNotification';
import { useConfirm } from '@/shared/composables/useConfirm';
import { useAuthStore } from '@/shared/stores/auth.store';
import { useWorkspaceStore } from '@/shared/stores/workspace.store';
import { useEmployeeStore } from '../stores/employee.store';
import { scheduleRepository } from '../repositories/schedule.repository';
import { employeeRepository } from '../repositories/employee.repository';
import EmployeeSelect from './EmployeeSelect.vue';
import WeekScheduleAccordion from './WeekScheduleAccordion.vue';
import DetailDialog from './DetailDialog.vue';
import { DEFAULT_SCHEDULE_ID } from '../types/schedule.types';
import type {
  BusinessDayFrame,
  ScheduleShiftInput,
  CreateScheduleDTO,
} from '../types/schedule.types';

const scheduleStore = useScheduleStore();
const notification = useNotification();
const authStore = useAuthStore();
const employeeStore = useEmployeeStore();
const workspaceStore = useWorkspaceStore();
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
const dataRevision = ref(0);

const isEmployeeView = computed(() => workspaceStore.isWorkMode || authStore.userRole === 'employee');
const myEmployeeId = ref<string | null>(null);

const allowedIds = computed(() =>
  isEmployeeView.value && myEmployeeId.value ? [myEmployeeId.value] : undefined,
);

const copyExcludeIds = computed(() => {
  if (isEmployeeView.value && myEmployeeId.value) return [myEmployeeId.value];
  return selectedEmployeeId.value ? [selectedEmployeeId.value] : undefined;
});

onMounted(async () => {
  await Promise.all([employeeStore.fetchEmployeesWithRoles(), loadBusinessFrames()]);
  const previousId = selectedEmployeeId.value;
  if (isEmployeeView.value) {
    const userId = authStore.user?.id;
    const match = employeeStore.employees.find(
      (e) => e.user_id === userId || e.supabase_user_id === userId,
    );
    myEmployeeId.value = match?.id ?? null;
    selectedEmployeeId.value = myEmployeeId.value;
    if (myEmployeeId.value) {
      loadPolicyFromEmployee();
    }
  } else {
    selectedEmployeeId.value = employeeStore.activeEmployees[0]?.id ?? null;
  }

  // Si el empleado ya estaba seleccionado, el watcher no se dispara al montar.
  // Cargamos su horario explícitamente para que el acordeón tenga datos.
  if (selectedEmployeeId.value && selectedEmployeeId.value === previousId) {
    await loadScheduleFor(selectedEmployeeId.value);
  }
});

// --- Política de reserva (autogestionada por el empleado) ---

const policy = reactive({
  advance_booking_days: 7,
  min_advance_minutes: 15,
});

function loadPolicyFromEmployee() {
  const me = employeeStore.employees.find((e) => e.id === myEmployeeId.value);
  if (!me) return;
  policy.advance_booking_days = me.advance_booking_days ?? 7;
  policy.min_advance_minutes = me.min_advance_minutes ?? 15;
}

function savePolicy() {
  if (!myEmployeeId.value) return Promise.resolve();
  return employeeRepository.update(myEmployeeId.value, {
    advance_booking_days: policy.advance_booking_days,
    min_advance_minutes: policy.min_advance_minutes,
  });
}

// --- Marco global del negocio (filas employee_id NULL) ---

const businessFrames = reactive(new Map<number, BusinessDayFrame>());
const framesLoaded = ref(false);
const hasBusinessFrame = computed(() => businessFrames.size > 0);

async function loadBusinessFrames() {
  try {
    const rows = await scheduleRepository.getByEmployee(null);
    businessFrames.clear();
    for (const row of rows) {
      if (!row.is_active) continue;
      const start = t5(row.start_time);
      const end = t5(row.end_time);
      const current = businessFrames.get(row.day_of_week);
      businessFrames.set(row.day_of_week, current
        ? {
            start_time: start < t5(current.start_time) ? start : current.start_time,
            end_time: end > t5(current.end_time) ? end : current.end_time,
          }
        : { start_time: start, end_time: end });
    }
  } finally {
    framesLoaded.value = true;
  }
}

function t5(t?: string): string {
  return (t ?? '').slice(0, 5);
}

function format12(value?: string | null): string {
  const match = /^(\d{1,2}):(\d{2})/.exec(value ?? '');
  if (!match) return '—';
  const hour = Number(match[1]);
  return `${hour % 12 || 12}:${match[2]} ${hour >= 12 ? 'PM' : 'AM'}`;
}

function dayLabelOf(day: number): string {
  return daysOfWeek.find((d) => d.value === day)?.label ?? `día ${day}`;
}

function resolveEmployeeId(id: string | null): string | null {
  return id === DEFAULT_SCHEDULE_ID ? null : id;
}

const localShifts = reactive<Map<number, ScheduleShiftInput[]>>(new Map());
const dayEnabled = reactive<Map<number, boolean>>(new Map());

const daysOfWeek = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
];

function defaultShift(day: number): ScheduleShiftInput {
  const frame = businessFrames.get(day);
  return {
    start_time: t5(frame?.start_time ?? '09:00'),
    end_time: t5(frame?.end_time ?? '17:00'),
  };
}

function addMinutes(time: string, minutes: number): string {
  const [h, m] = t5(time).split(':').map(Number);
  const total = Math.min(h * 60 + m + minutes, 23 * 60 + 59);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function initLocalShifts() {
  localShifts.clear();
  dayEnabled.clear();
  for (const day of daysOfWeek) {
    const daySchedules = scheduleStore.schedules.filter(
      (s) => s.day_of_week === day.value && s.is_active,
    );
    const shifts = daySchedules.map((s) => ({
      start_time: t5(s.start_time),
      end_time: t5(s.end_time),
    }));
    localShifts.set(day.value, shifts);
    dayEnabled.set(day.value, shifts.length > 0);
  }
  dataRevision.value += 1;
}

const summary = computed(() => {
  let days = 0;
  let minutes = 0;
  for (const day of daysOfWeek) {
    if (!dayEnabled.get(day.value)) continue;
    const shifts = localShifts.get(day.value) ?? [];
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

function onToggleDay(day: number, enabled: boolean) {
  if (enabled && businessFrames.size > 0 && !businessFrames.has(day)) {
    notification.error(`El negocio no trabaja el ${dayLabelOf(day)}`);
    return;
  }

  dayEnabled.set(day, enabled);
  if (enabled) {
    const shifts = localShifts.get(day) ?? [];
    if (!shifts.length) {
      localShifts.set(day, [defaultShift(day)]);
    }
  }
  dirty.value = true;
}

function onAddShift(day: number) {
  const frame = businessFrames.get(day);
  const shifts = [...(localShifts.get(day) ?? [])];
  const previous = shifts[shifts.length - 1];
  const start = t5(previous?.end_time ?? frame?.start_time ?? '09:00');
  if (frame && start >= t5(frame.end_time)) {
    notification.info(`No queda espacio en el marco del ${dayLabelOf(day)}`);
    return;
  }
  let end = addMinutes(start, 60);
  if (frame && end > t5(frame.end_time)) end = t5(frame.end_time);
  if (end <= start) {
    end = t5(frame?.end_time ?? '17:00');
  }
  if (end <= start) {
    notification.info(`No queda espacio en el marco del ${dayLabelOf(day)}`);
    return;
  }
  shifts.push({ start_time: start, end_time: end });
  localShifts.set(day, shifts);
  dirty.value = true;
}

function onUpdateShift(day: number, index: number, shift: ScheduleShiftInput) {
  const shifts = [...(localShifts.get(day) ?? [])];
  if (!shifts[index]) return;
  shifts[index] = shift;
  localShifts.set(day, shifts);
  dirty.value = true;
}

function removeShift(day: number, index: number) {
  const shifts = [...(localShifts.get(day) ?? [])];
  if (!shifts[index]) return;
  shifts.splice(index, 1);
  localShifts.set(day, shifts);
  dirty.value = true;
}

function copyDayToWeek(day: number) {
  const source = localShifts.get(day) ?? [];
  let skipped = 0;
  for (const d of daysOfWeek) {
    if (businessFrames.size > 0 && !businessFrames.has(d.value)) {
      if (!dayEnabled.get(d.value)) skipped += 1;
      continue;
    }
    localShifts.set(d.value, source.map((s) => ({ ...s })));
    if (source.length) dayEnabled.set(d.value, true);
  }
  dirty.value = true;
  dataRevision.value += 1;
  const note = skipped ? ` (${skipped} días no laborables omitidos)` : '';
  notification.info(`Horario del ${dayLabelOf(day)} copiado a los días laborables${note}`);
}

function validateLocalShifts(): string | null {
  for (const day of daysOfWeek) {
    if (!dayEnabled.get(day.value)) continue;
    const shifts = localShifts.get(day.value) ?? [];
    const frame = businessFrames.get(day.value);

    if (businessFrames.size > 0 && !businessFrames.has(day.value)) {
      return `El negocio no trabaja el ${day.label}. Desactivalo para guardar.`;
    }

    for (let i = 0; i < shifts.length; i += 1) {
      const shift = shifts[i];
      const start = t5(shift.start_time);
      const end = t5(shift.end_time);
      if (!start || !end || start >= end) {
        return `Revisá el turno ${i + 1} del ${day.label}: la hora de fin debe ser posterior al inicio.`;
      }
      if (frame && (start < t5(frame.start_time) || end > t5(frame.end_time))) {
        return `El turno ${i + 1} del ${day.label} está fuera del horario del negocio (${format12(frame.start_time)}–${format12(frame.end_time)}).`;
      }
      for (let j = i + 1; j < shifts.length; j += 1) {
        const other = shifts[j];
        if (start < t5(other.end_time) && end > t5(other.start_time)) {
          return `Los turnos ${i + 1} y ${j + 1} del ${day.label} se superponen.`;
        }
      }
    }
  }
  return null;
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
  const sourceEnabled = new Map(dayEnabled);
  const target = copyTargetId.value;
  showCopyDialog.value = false;

  suppressWatch.value = true;
  selectedEmployeeId.value = target;
  await scheduleStore.fetchSchedules(resolveEmployeeId(target));
  initLocalShifts();
  for (const [day, shifts] of source) {
    localShifts.set(day, shifts);
  }
  for (const [day, enabled] of sourceEnabled) {
    dayEnabled.set(day, enabled);
  }
  dataRevision.value += 1;
  dirty.value = true;
  notification.success('Horario copiado. Revisá y pulsá Guardar.');
}

function buildPayload(): CreateScheduleDTO[] {
  const out: CreateScheduleDTO[] = [];
  for (const day of daysOfWeek) {
    if (!dayEnabled.get(day.value)) continue;
    for (const shift of localShifts.get(day.value) ?? []) {
      out.push({ day_of_week: day.value, ...shift });
    }
  }
  return out;
}

function errorMessage(e: unknown): string {
  if (typeof e === 'string') return e;
  if (e && typeof e === 'object' && 'message' in e) {
    return String((e as { message?: unknown }).message ?? '');
  }
  return '';
}

async function onSave() {
  if (!selectedEmployeeId.value) return;
  const localError = validateLocalShifts();
  if (localError) {
    notification.error(localError);
    return;
  }
  saving.value = true;
  try {
    await scheduleStore.updateSchedules(buildPayload(), resolveEmployeeId(selectedEmployeeId.value));
    await scheduleStore.fetchSchedules(resolveEmployeeId(selectedEmployeeId.value));
    if (isEmployeeView.value && myEmployeeId.value) {
      await savePolicy();
    }
    initLocalShifts();
    dirty.value = false;
    notification.success('Turnos guardados correctamente');
  } catch (e: unknown) {
    const msg = errorMessage(e);
    const closed = /BUSINESS_DAY_CLOSED:(\d)/.exec(msg);
    const outOfFrame = /SHIFT_OUT_OF_BUSINESS_HOURS:(\d+):([\d:]+):([\d:]+)/.exec(msg);
    if (closed) {
      notification.error(`El negocio no trabaja el ${dayLabelOf(Number(closed[1]))}`);
    } else if (outOfFrame) {
      notification.error(
        `El turno del ${dayLabelOf(Number(outOfFrame[1]))} está fuera del horario del negocio (${format12(outOfFrame[2])} – ${format12(outOfFrame[3])})`,
      );
    } else if (msg.includes('Not authorized') || msg.includes('no autorizado') || msg.includes('authorized')) {
      notification.error('No tenés permiso para editar este horario');
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
      loadPolicyFromEmployee();
      dirty.value = false;
    }
  });
}

async function onEmployeeChange(id: string | null) {
  if (id === selectedEmployeeId.value) return;
  if (dirty.value) {
    const ok = await confirm('Tenés cambios sin guardar. ¿Descartarlos?');
    if (!ok) return;
  }
  selectedEmployeeId.value = id;
}

async function loadScheduleFor(id: string | null) {
  if (!id) {
    localShifts.clear();
    dayEnabled.clear();
    dataRevision.value += 1;
    dirty.value = false;
    return;
  }
  await scheduleStore.fetchSchedules(resolveEmployeeId(id));
  initLocalShifts();
  dirty.value = false;
}

watch(selectedEmployeeId, async (id) => {
  if (suppressWatch.value) {
    suppressWatch.value = false;
    return;
  }
  await loadScheduleFor(id);
});
</script>

<style scoped>
.schedule-editor {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.se {
  width: 100%;
  max-width: 640px;
  margin-inline: auto;
  border: 1px solid rgb(var(--v-theme-on-surface), 0.12);
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
  overflow: hidden;
}

.se__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px 12px;
}

.se__headings {
  min-width: 0;
}

.se__badges {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.se__badge {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 2px 8px;
  border: 1px solid rgb(var(--v-theme-on-surface), 0.14);
  border-radius: 4px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-on-surface), 0.6);
}

.se__employee-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 0 20px 14px;
  border-bottom: 1px solid rgb(var(--v-theme-on-surface), 0.1);
}

.se__employee {
  flex: 0 1 320px;
  max-width: 420px;
}

.se__copy-btn.v-btn {
  min-height: 44px;
}

.se__empty {
  padding: 34px 20px;
  text-align: center;
  font-size: 13px;
  color: rgb(var(--v-theme-on-surface), 0.55);
}

.se__summary {
  display: flex;
  align-items: baseline;
  gap: 6px;
  padding: 12px 20px 0;
  font-size: 11px;
  color: rgb(var(--v-theme-on-surface), 0.55);
}

.se__stat {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
}

.se__stat-value {
  font-size: 13px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: rgb(var(--v-theme-on-surface));
}

.se__stat-sep {
  color: rgb(var(--v-theme-on-surface), 0.3);
}

.se__note {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  margin: 12px 20px 0;
  padding: 9px 10px;
  border: 1px dashed rgb(var(--v-theme-on-surface), 0.16);
  border-radius: 6px;
  font-size: 11px;
  line-height: 1.5;
  color: rgb(var(--v-theme-on-surface), 0.6);
}

.se__note .v-icon {
  flex-shrink: 0;
  margin-top: 1px;
}

.se__policy {
  margin: 14px 20px 0;
  padding: 12px 14px;
  border: 1px solid rgb(var(--v-theme-on-surface), 0.1);
  border-radius: 8px;
  background: rgb(var(--v-theme-on-surface), 0.018);
}

.se__policy-head {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
}

.se__policy-sub {
  margin: 3px 0 10px;
  font-size: 11px;
  line-height: 1.45;
  color: rgb(var(--v-theme-on-surface), 0.55);
}

.se__policy-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.schedule-editor :deep(.wsa) {
  margin: 14px 20px 0;
}

.se__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 16px;
  padding: 12px 20px calc(14px + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid rgb(var(--v-theme-on-surface), 0.1);
  background: rgb(var(--v-theme-surface));
}

.se__footer--dirty {
  background: rgb(var(--v-theme-on-surface), 0.025);
}

.se__footer-label {
  font-size: 11px;
  line-height: 1.4;
  color: rgb(var(--v-theme-on-surface), 0.5);
}

.se__footer-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.se__dialog-copy {
  margin: 0 0 14px;
  font-size: 12px;
  line-height: 1.55;
  color: rgb(var(--v-theme-on-surface), 0.6);
}

@media (max-width: 699px) {
  .se__head {
    flex-direction: column;
    gap: 8px;
    padding: 16px 14px 10px;
  }

  .se__badges {
    justify-content: flex-start;
  }

  .se__employee-row,
  .se__summary,
  .se__policy {
    padding-left: 14px;
    padding-right: 14px;
  }

  .se__note {
    margin-left: 14px;
    margin-right: 14px;
  }

  .schedule-editor :deep(.wsa) {
    margin-left: 10px;
    margin-right: 10px;
  }

  .se__policy-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .se__footer {
    flex-direction: column;
    align-items: stretch;
    padding-left: 14px;
    padding-right: 14px;
  }

  .se__footer-actions {
    justify-content: flex-end;
  }
}

@media (max-width: 479px) {
  .se__footer-actions {
    flex-direction: column-reverse;
  }

  .se__footer-actions .v-btn {
    width: 100%;
  }
}
</style>
