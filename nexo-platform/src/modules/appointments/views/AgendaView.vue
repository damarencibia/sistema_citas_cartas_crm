<template>
  <div class="agenda">
    <ImmersiveNavButton />

    <div class="agenda__body">
      <AgendaWorkspacePanel
        v-if="showWorkspacePanel"
        class="agenda__panel"
        :selected-date="filters.date"
        :bookings="monthBookings"
        :closed-dates="monthClosedDates"
        :blocked-slots="dayBlocks"
        :employee-names="employeeNamesById"
        :can-close="!!filters.employee_id"
        @open-booking="onPanelBooking"
        @open-block="onReleaseBlock"
        @open-closure="onPanelClosure"
        @go-approval="onPanelApproval"
      />

      <div class="agenda__main">
        <div class="agenda__toolbar">
          <div class="agenda__toolbar-left">
            <h1 class="agenda__title">{{ submoduleTitle }}</h1>

            <v-select
              v-if="tabKey === 'reservas' && !workspaceStore.isWorkMode && !teamView"
              v-model="filters.employee_id"
              :items="employeeOptions"
              item-title="text"
              item-value="value"
              label="Empleado"
              density="compact"
              hide-details
              variant="outlined"
              class="agenda__employee"
            />

            <v-btn-toggle
              v-if="tabKey === 'reservas' && !workspaceStore.isWorkMode"
              :model-value="teamView ? 'equipo' : 'individual'"
              density="compact"
              mandatory
              rounded="lg"
              class="agenda__mode"
              @update:model-value="setLayoutMode($event as 'equipo' | 'individual')"
            >
              <v-btn value="equipo" size="small" class="text-none">Equipo</v-btn>
              <v-btn value="individual" size="small" class="text-none">Individual</v-btn>
            </v-btn-toggle>
          </div>

          <div class="agenda__toolbar-right">
            <v-tabs
              v-if="tabKey === 'reservas' && !showTeamBoard"
              v-model="reservasTab"
              density="compact"
              color="on-surface"
              class="agenda__tabs"
            >
              <v-tab value="all" class="text-none">Todas</v-tab>
              <v-tab value="approval" class="text-none">
                Pendientes
                <span
                  v-if="bookingStore.pendingApprovalBookings.length > 0"
                  class="agenda__tab-count"
                >
                  {{ bookingStore.pendingApprovalBookings.length }}
                </span>
              </v-tab>
            </v-tabs>

            <NotificationCenter class="agenda__utility" />

            <v-btn
              icon
              size="small"
              variant="text"
              aria-label="Cambiar tema"
              class="agenda__utility"
              @click="uiStore.toggleTheme()"
            >
              <v-icon size="19">{{ uiStore.theme === 'light' ? 'mdi-weather-night' : 'mdi-weather-sunny' }}</v-icon>
            </v-btn>

            <AccountMenu />
          </div>
        </div>

        <div class="agenda__content">
          <template v-if="tabKey === 'espera'">
            <div class="agenda__scroll">
              <div class="agenda__card agenda__card--waitlist">
                <WaitlistPanel
                  :entries="bookingStore.waitlist"
                  :loading="bookingStore.waitlistLoading"
                  @cancel="onWaitlistCancel"
                />
              </div>
            </div>
          </template>

          <template v-else-if="showTeamBoard">
            <div class="agenda__scroll">
              <div class="agenda__card">
                <TeamScheduleBoard
                  :date="filters.date ?? ''"
                  :employees="employeeStore.activeEmployees"
                  @change-date="onSelectUnifiedDay"
                  @open-booking="openDetail"
                  @select-employee="onTeamSelectEmployee"
                />
              </div>
            </div>
          </template>

          <template v-else>
            <v-tabs-window v-model="reservasTab" class="agenda__window">
              <v-tabs-window-item value="all" class="agenda__window-item">
                <MonthlyAgendaBoard
                  :month-anchor="monthAnchor"
                  :dates="monthDates"
                  :bookings="monthBookings"
                  :closed-dates="monthClosedDates"
                  :selected-date="filters.date"
                  :loading="monthLoading"
                  @select-date="onSelectUnifiedDay"
                  @prev-month="shiftMonth(-1)"
                  @next-month="shiftMonth(1)"
                  @prev-year="shiftYear(-1)"
                  @next-year="shiftYear(1)"
                  @today="goToTodayMonth"
                />
              </v-tabs-window-item>

              <v-tabs-window-item value="approval" class="agenda__window-item">
                <div class="agenda__scroll">
                  <div class="agenda__card">
                    <BookingApprovalList
                      :bookings="bookingStore.pendingApprovalBookings"
                      @approve="onApproveBooking"
                      @reject="onRejectBooking"
                    />
                  </div>
                </div>
              </v-tabs-window-item>
            </v-tabs-window>
          </template>
        </div>
      </div>
    </div>

    <!-- Panel del día en móvil: hoja inferior -->
    <v-bottom-sheet v-model="daySheet" class="agenda-sheet" :scrim="true">
      <div class="agenda-sheet__inner">
        <AgendaWorkspacePanel
          variant="sheet"
          :selected-date="filters.date"
          :bookings="monthBookings"
          :closed-dates="monthClosedDates"
          :blocked-slots="dayBlocks"
          :employee-names="employeeNamesById"
          :can-close="!!filters.employee_id"
          @open-booking="onPanelBooking"
          @open-block="onReleaseBlock"
          @open-closure="onPanelClosure"
          @go-approval="onPanelApproval"
          @close="daySheet = false"
        />
      </div>
    </v-bottom-sheet>

    <BookingDetailDrawer
      :visible="showDetail"
      :booking="selectedBooking"
      :waitlist-entries="selectedBooking ? waitlistBySlot[selectedBooking.id] ?? [] : []"
      :tenant-name="tenantStore.tenant?.name"
      show-actions
      @close="showDetail = false"
      @cancel-turn="onCancelTurn"
      @waitlist-remove="onWaitlistCancel"
    />

    <!-- Cierre del Día: modal centrado (fullscreen en móvil), shell editorial compartido -->
    <DetailDialog
      :visible="showClosure"
      title="Cierre del Día"
      :meta="closureMeta"
      :sealed="dayClosed"
      :width="920"
      stretch
      @close="showClosure = false"
    >
      <DailyClosurePanel
        ref="closurePanelRef"
        :visible="showClosure"
        :employee-id="filters.employee_id"
        :date="filters.date ?? ''"
        :tenant-id="tenantId"
        @mark-attended="onMarkAttended"
        @mark-no-show="onMarkNoShow"
        @cancel-selection="onCancelSelection"
        @mark-all-attended="onMarkAllAttended"
        @remove-extra="onRemoveExtra"
        @closure-changed="onClosureChanged"
        @close-dialog="showClosure = false"
      />
    </DetailDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useDisplay } from 'vuetify';
import { formatDate } from '@/shared/utils/format';
import { useNotification } from '@/shared/composables/useNotification';
import { useBookingStore } from '../stores/booking.store';
import { useEmployeeStore } from '../stores/employee.store';
import BookingDetailDrawer from '../components/BookingDetailDrawer.vue';
import BookingApprovalList from '../components/BookingApprovalList.vue';
import WaitlistPanel from '../components/WaitlistPanel.vue';
import DailyClosurePanel from '../components/DailyClosurePanel.vue';
import DetailDialog from '../components/DetailDialog.vue';
import MonthlyAgendaBoard from '../components/MonthlyAgendaBoard.vue';
import AgendaWorkspacePanel from '../components/AgendaWorkspacePanel.vue';
import { dailyExtrasRepository } from '../repositories/daily-extras.repository';
import { dailyClosureRepository } from '../repositories/daily-closure.repository';
import { bookingRepository } from '../repositories/booking.repository';
import { blockedSlotsRepository } from '../repositories/blocked-slots.repository';
import { useTenantStore } from '@/shared/stores/tenant.store';
import { useAuthStore } from '@/shared/stores/auth.store';
import { useUiStore } from '@/shared/stores/ui.store';
import { useWorkspaceStore } from '@/shared/stores/workspace.store';
import type { Booking, WaitlistEntry, DailyExtra, BlockedSlot } from '../types/booking.types';
import TeamScheduleBoard from '../components/TeamScheduleBoard.vue';
import ImmersiveNavButton from '@/shared/components/ImmersiveNavButton.vue';
import AccountMenu from '@/shared/components/AccountMenu.vue';
import NotificationCenter from '@/modules/notifications/components/NotificationCenter.vue';

const bookingStore = useBookingStore();
const employeeStore = useEmployeeStore();
const tenantStore = useTenantStore();
const authStore = useAuthStore();
const uiStore = useUiStore();
const notification = useNotification();
const route = useRoute();
const router = useRouter();
const { smAndDown } = useDisplay();

const reservasTab = ref<'all' | 'approval'>('all');
const monthAnchor = ref(new Date().toISOString().split('T')[0]);
const monthLoading = ref(false);
/** Reservas del mes visible (para la grilla y el panel del día) */
const monthBookings = ref<Booking[]>([]);
/** Fechas del mes visible con cierre vigente */
const monthClosedDates = ref<string[]>([]);
const dayBlocks = ref<BlockedSlot[]>([]);
const daySheet = ref(false);
const showDetail = ref(false);
const showClosure = ref(false);
const dayClosed = ref(false);
const selectedBooking = ref<Booking | null>(null);
const closurePanelRef = ref<InstanceType<typeof DailyClosurePanel> | null>(null);
const isEmployeeView = computed(() => authStore.userRole === 'employee');
const myEmployeeId = ref<string | null>(null);
const workspaceStore = useWorkspaceStore();
const teamView = ref(route.query.vista === 'equipo');
const showTeamBoard = computed(() => !workspaceStore.isWorkMode && teamView.value);
/** Panel de día solo en la vista individual de reservas del mes */
const showWorkspacePanel = computed(() => tabKey.value === 'reservas' && !showTeamBoard.value);

function setLayoutMode(mode: 'equipo' | 'individual') {
  daySheet.value = false;
  router.replace({
    query: {
      tab: 'reservas',
      ...(mode === 'equipo' ? { vista: 'equipo' } : {}),
    },
  });
}

function onTeamSelectEmployee(employeeId: string) {
  filters.employee_id = employeeId;
  setLayoutMode('individual');
}

const filters = reactive({
  date: new Date().toISOString().split('T')[0] as string | null,
  employee_id: null as string | null,
});

const tabKey = computed<'reservas' | 'espera'>(() => {
  const t = route.query.tab;
  return t === 'espera' ? 'espera' : 'reservas';
});

const submoduleTitle = computed(() => {
  switch (tabKey.value) {
    case 'espera': return 'Espera';
    default: return workspaceStore.isWorkMode
      ? 'Mi Agenda'
      : teamView.value ? 'Mi Día del Equipo' : 'Reservas';
  }
});

const tenantId = computed(() => tenantStore.tenant?.id ?? '');

const employeeOptions = computed(() =>
  employeeStore.activeEmployees.map((e) => ({
    value: e.id,
    text: `${e.first_name} ${e.last_name}`,
  })),
);

/** Mapa id → nombre para la meta de los bloques de la vista unificada */
const employeeNamesById = computed<Record<string, string>>(() => {
  const map: Record<string, string> = {};
  for (const e of employeeStore.employees) {
    map[e.id] = `${e.first_name} ${e.last_name}`;
  }
  return map;
});

/** En la vista mensual, elegir un día también mueve el mes visible a su mes */
function onSelectUnifiedDay(day: string) {
  filters.date = day;
  monthAnchor.value = day;
  if (smAndDown.value && tabKey.value === 'reservas' && !teamView.value) {
    daySheet.value = true;
  }
}

const closureEmployeeName = computed(() => {
  if (!filters.employee_id) return 'Sin empleado';
  const emp = employeeStore.employees.find((e) => e.id === filters.employee_id);
  return emp ? `${emp.first_name} ${emp.last_name}` : 'Empleado';
});

/** Meta editorial del shell: fecha · empleado */
const closureMeta = computed(
  () => `${filters.date ? formatDate(filters.date) : ''} · ${closureEmployeeName.value}`,
);

const waitlistBySlot = computed<Record<string, WaitlistEntry[]>>(() => {
  const map: Record<string, WaitlistEntry[]> = {};
  for (const b of bookingStore.bookings) {
    if (!b.date || !b.start_time) continue;
    const time = b.start_time.slice(0, 5);
    const matches = bookingStore.waitlist.filter(
      (e) =>
        (e.status === 'waiting' || e.status === 'notified') &&
        (!e.entry_expires_at || new Date(e.entry_expires_at) > new Date()) &&
        e.preferred_date === b.date &&
        (e.preferred_times?.some((t) => t.slice(0, 5) === time) ||
          (!!e.preferred_time_start && e.preferred_time_start.slice(0, 5) === time)) &&
        (e.employee_id === null || e.employee_id === b.employee_id),
    );
    if (matches.length) map[b.id] = matches;
  }
  return map;
});

async function loadDayBlocks() {
  if (!tenantId.value || !filters.employee_id || !filters.date) {
    dayBlocks.value = [];
    return;
  }
  try {
    dayBlocks.value = await blockedSlotsRepository.getByEmployeeAndDate(
      tenantId.value,
      filters.employee_id,
      filters.date,
    );
  } catch {
    dayBlocks.value = [];
  }
}

function openClosure() {
  if (!filters.employee_id || !filters.date) return;
  showClosure.value = true;
  employeeStore.fetchEmployeeServices(filters.employee_id);
}

async function loadDayClosed() {
  if (!filters.employee_id || !filters.date) {
    dayClosed.value = false;
    return;
  }
  try {
    const closure = await dailyClosureRepository.getByEmployeeAndDate(
      filters.employee_id,
      filters.date,
    );
    dayClosed.value = !!closure;
  } catch {
    dayClosed.value = false;
  }
}

/** Rango del mes visible: primer y último día */
const monthRange = computed(() => {
  const anchor = new Date(`${monthAnchor.value}T12:00:00`);
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  return [toIsoDate(first), toIsoDate(last)] as const;
});

/** Grilla del mes: semanas completas (lunes primero), 5 o 6 filas */
const monthDates = computed(() => {
  const anchor = new Date(`${monthAnchor.value}T12:00:00`);
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);

  const start = new Date(first);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const end = new Date(last);
  end.setDate(end.getDate() + (6 - ((end.getDay() + 6) % 7)));

  const dates: string[] = [];
  for (const cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    dates.push(toIsoDate(cursor));
  }
  return dates;
});

/** Reservas del mes visible para la grilla mensual y su panel de día */
async function loadMonthData() {
  monthLoading.value = true;
  try {
    const [start, end] = monthRange.value;
    monthBookings.value = await bookingRepository.getByFilters({
      date_from: start,
      date_to: end,
      employee_id: filters.employee_id,
    });
  } finally {
    monthLoading.value = false;
  }
}

/** Cierres vigentes del mes visible (sello en la grilla y CTA del panel) */
async function loadMonthClosedDates() {
  if (!filters.employee_id) {
    monthClosedDates.value = [];
    return;
  }
  try {
    const [start, end] = monthRange.value;
    const closures = await dailyClosureRepository.getByEmployeeAndRange(
      filters.employee_id,
      start,
      end,
    );
    monthClosedDates.value = closures.map((c) => c.date);
  } catch {
    monthClosedDates.value = [];
  }
}

function shiftMonth(delta: number) {
  const d = new Date(`${monthAnchor.value}T12:00:00`);
  d.setDate(1);
  d.setMonth(d.getMonth() + delta);
  monthAnchor.value = toIsoDate(d);
}

function shiftYear(delta: number) {
  const d = new Date(`${monthAnchor.value}T12:00:00`);
  d.setDate(1);
  d.setFullYear(d.getFullYear() + delta);
  monthAnchor.value = toIsoDate(d);
}

function goToTodayMonth() {
  const today = new Date().toISOString().split('T')[0];
  monthAnchor.value = today;
  filters.date = today;
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

watch(() => filters.employee_id, () => {
  loadMonthData();
  loadMonthClosedDates();
});

watch(() => [filters.employee_id, filters.date], loadDayClosed, { immediate: true });

watch(() => [filters.employee_id, filters.date], loadDayBlocks, { immediate: true });

watch(monthAnchor, () => {
  loadMonthData();
  loadMonthClosedDates();
});

onMounted(async () => {
  await employeeStore.fetchEmployees();
  // Modo trabajo: fijamos la agenda al perfil del propio usuario (cualquier rol)
  if (workspaceStore.isWorkMode || isEmployeeView.value) {
    await employeeStore.fetchEmployeesWithRoles();
    const userId = authStore.user?.id;
    const match = employeeStore.employees.find(
      (e) => e.user_id === userId || e.supabase_user_id === userId,
    );
    myEmployeeId.value = match?.id ?? null;
    filters.employee_id = myEmployeeId.value;
  } else {
    const firstEmployeeId = employeeStore.activeEmployees[0]?.id ?? null;
    filters.employee_id = firstEmployeeId;
  }
  await loadForTab(tabKey.value);
  await bookingStore.fetchWaitlist();
});

watch(() => route.query.tab, (tab) => {
  daySheet.value = false;
  loadForTab((tab as string) ?? 'reservas');
});

watch(() => route.query.vista, (vista) => {
  daySheet.value = false;
  teamView.value = vista === 'equipo';
});

watch(filters, () => {
  bookingStore.setFilters({
    date: filters.date ?? undefined,
    employee_id: filters.employee_id,
  });
  if (tabKey.value === 'reservas') bookingStore.fetchBookings();
}, { deep: true });

watch(() => uiStore.sidebar, (open) => {
  if (open && showDetail.value) {
    showDetail.value = false;
  }
});

async function loadForTab(tab: string) {
  if (tab === 'reservas') {
    await bookingStore.fetchBookings({
      date: filters.date ?? undefined,
      employee_id: filters.employee_id,
    });
    await loadMonthData();
    await loadMonthClosedDates();
  }
}

/** Cerrar/reabrir un día actualiza tanto el estado del día como el set mensual */
function onClosureChanged(closed: boolean) {
  dayClosed.value = closed;
  const date = filters.date;
  if (!date) return;
  const set = new Set(monthClosedDates.value);
  if (closed) set.add(date);
  else set.delete(date);
  monthClosedDates.value = [...set];
}

function openDetail(booking: Booking) {
  selectedBooking.value = booking;
  showDetail.value = true;
}

/** Acciones del panel del día */
function onPanelBooking(booking: Booking) {
  daySheet.value = false;
  openDetail(booking);
}

function onPanelClosure() {
  daySheet.value = false;
  openClosure();
}

function onPanelApproval() {
  daySheet.value = false;
  reservasTab.value = 'approval';
}

async function refreshBookings() {
  await bookingStore.fetchBookings();
}

async function onCancelTurn(data: { keepBlocked: boolean; reason: string }) {
  const booking = selectedBooking.value;
  if (!booking) return;
  try {
    await bookingStore.updateStatus(
      booking.id,
      'cancelled',
      data.reason || undefined,
      'employee',
    );
    if (data.keepBlocked && booking.employee_id) {
      await blockedSlotsRepository.create({
        tenant_id: booking.tenant_id,
        employee_id: booking.employee_id ?? '',
        date: booking.date,
        start_time: booking.start_time?.slice(0, 5) || '',
        end_time: booking.end_time?.slice(0, 5) || '',
        reason: data.reason || 'Turno cancelado',
        created_by: authStore.user?.id ?? null,
      });
      notification.success('Turno cancelado y horario bloqueado');
    } else {
      notification.success('Turno cancelado');
    }
    showDetail.value = false;
    await refreshBookings();
    await loadMonthData();
    await loadDayBlocks();
  } catch (e) {
    notification.error((e as Error).message || 'Error al cancelar turno');
  }
}

async function onReleaseBlock(block: BlockedSlot) {
  try {
    await blockedSlotsRepository.remove(block.id);
    notification.success('Bloqueo liberado');
    await loadDayBlocks();
  } catch {
    notification.error('Error al liberar el bloqueo');
  }
}

async function onApproveBooking(booking: Booking) {
  try {
    await bookingStore.approveBooking(booking.id);
    notification.success('Reserva aprobada');
    await refreshBookings();
  } catch {
    notification.error('Error al aprobar reserva');
  }
}

async function onRejectBooking(booking: Booking, reason: string) {
  try {
    await bookingStore.rejectBooking(booking.id, reason || undefined);
    notification.success('Reserva rechazada');
    await refreshBookings();
  } catch {
    notification.error('Error al rechazar reserva');
  }
}

// Waitlist handlers
async function onWaitlistCancel(entry: WaitlistEntry) {
  try {
    await bookingStore.cancelWaitlistEntry(entry.id);
    await bookingStore.fetchWaitlist();
    notification.success('Entrada de waitlist cancelada');
  } catch {
    notification.error('Error al cancelar waitlist');
  }
}

// Daily closure handlers
async function onMarkAttended(booking: Booking) {
  try {
    await bookingStore.updateStatus(booking.id, 'completed');
    notification.success(`${booking.customer_name || 'Cliente'} marcado como asistido`);
    await refreshBookings();
    closurePanelRef.value?.loadExtras();
  } catch (e) {
    notification.error((e as Error).message || 'Error al actualizar estado');
  }
}

async function onMarkNoShow(booking: Booking) {
  try {
    await bookingStore.updateStatus(booking.id, 'no_show');
    notification.success(`${booking.customer_name || 'Cliente'} marcado como no asistido`);
    await refreshBookings();
    closurePanelRef.value?.loadExtras();
  } catch (e) {
    notification.error((e as Error).message || 'Error al actualizar estado');
  }
}

async function onCancelSelection(booking: Booking) {
  try {
    await bookingStore.updateStatus(booking.id, 'confirmed');
    notification.success('Selección cancelada — cita vuelta a pendiente');
    await refreshBookings();
    closurePanelRef.value?.loadExtras();
  } catch (e) {
    notification.error((e as Error).message || 'Error al cancelar selección');
  }
}

async function onMarkAllAttended(bookings: Booking[]) {
  try {
    for (const b of bookings) {
      await bookingStore.updateStatus(b.id, 'completed');
    }
    notification.success(`${bookings.length} citas marcadas como asistidas`);
    await refreshBookings();
    closurePanelRef.value?.loadExtras();
  } catch (e) {
    notification.error((e as Error).message || 'Error al actualizar estados');
  }
}

async function onRemoveExtra(extra: DailyExtra) {
  try {
    await dailyExtrasRepository.remove(extra.id);
    notification.success('Extra eliminado');
    closurePanelRef.value?.loadExtras();
  } catch (e) {
    notification.error((e as Error).message || 'Error al eliminar extra');
  }
}
</script>

<style scoped>
/* ═══ Estructura inmersiva ═══ */
.agenda {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: rgb(var(--v-theme-background));
}

.agenda__body {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
}

.agenda__panel {
  flex: 0 0 340px;
  width: 340px;
  min-height: 0;
  border-right: 1px solid rgb(var(--v-theme-on-surface), 0.12);
}

.agenda__main {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: rgb(var(--v-theme-background));
}

/* ═══ Barra contextual ═══ */
.agenda__toolbar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 16px;
  min-height: 56px;
  padding: 6px 28px;
  border-bottom: 1px solid rgb(var(--v-theme-on-surface), 0.12);
  background: rgb(var(--v-theme-surface));
}

.agenda__toolbar-left {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.agenda__title {
  margin: 0;
  font-size: 16px;
  line-height: 1.3;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: rgb(var(--v-theme-on-surface));
  white-space: nowrap;
}

.agenda__employee {
  flex: 0 1 200px;
  max-width: 200px;
}

.agenda__employee :deep(.v-field) {
  min-height: 44px;
}

.agenda__employee :deep(.v-field--focused .v-field__outline) {
  color: rgb(var(--v-theme-on-surface));
}

/* Toggle Equipo/Individual: herramienta monocroma */
.agenda__mode :deep(.v-btn) {
  text-transform: none;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0;
  color: rgb(var(--v-theme-on-surface), 0.65);
  min-height: 44px;
}

.agenda__mode :deep(.v-btn--active) {
  background: rgb(var(--v-theme-on-surface)) !important;
  color: rgb(var(--v-theme-surface)) !important;
}

.agenda__toolbar-right {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
}

.agenda__tabs {
  flex: 0 1 auto;
}

.agenda__tabs :deep(.v-tab) {
  min-width: 0;
  min-height: 44px;
  padding: 0 12px;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0;
  text-transform: none;
  color: rgb(var(--v-theme-on-surface), 0.6);
}

.agenda__tabs :deep(.v-tab--selected) {
  color: rgb(var(--v-theme-on-surface));
  font-weight: 600;
}

.agenda__tabs :deep(.v-tab__slider) {
  background: currentColor;
  opacity: 1;
}

.agenda__tab-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  margin-left: 6px;
  padding: 0 5px;
  border-radius: 999px;
  background: rgb(var(--v-theme-on-surface), 0.1);
  color: rgb(var(--v-theme-on-surface));
  font-size: 10px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.agenda__utility {
  color: rgb(var(--v-theme-on-surface), 0.72);
}

.agenda__utility.v-btn {
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
}

/* ═══ Contenido ═══ */
.agenda__content {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  padding: 18px 28px 24px;
  overflow: hidden;
}

.agenda__window {
  flex: 1 1 auto;
  min-height: 0;
}

.agenda__window :deep(.v-window__container) {
  height: 100%;
}

.agenda__window-item {
  height: 100%;
  min-height: 0;
}

.agenda__window-item :deep(.mab) {
  height: 100%;
}

.agenda__scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.agenda__card {
  max-width: 1100px;
  margin: 0 auto;
  padding: 20px;
  border: 1px solid rgb(var(--v-theme-on-surface), 0.12);
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
}

.agenda__card--waitlist {
  max-width: none;
  padding: 18px 24px 20px;
}

/* ═══ Hoja inferior móvil ═══ */
.agenda-sheet :deep(.v-bottom-sheet__content) {
  background: transparent !important;
  box-shadow: none !important;
}

.agenda-sheet__inner {
  max-width: 640px;
  margin: 0 auto;
  overflow: hidden;
  border-radius: 18px 18px 0 0;
  background: rgb(var(--v-theme-on-surface));
  box-shadow: 0 -12px 40px rgb(var(--v-theme-on-surface), 0.22);
}

.v-theme--dark .agenda-sheet__inner {
  background: rgb(var(--v-theme-surface-variant));
}

/* ═══ Responsive ═══ */
@media (max-width: 1279px) {
  .agenda__panel {
    flex-basis: 320px;
    width: 320px;
  }

  .agenda__toolbar {
    padding: 6px 18px;
  }

  .agenda__content {
    padding: 14px 18px 18px;
  }
}

@media (max-width: 959px) {
  .agenda__panel {
    display: none;
  }
}

@media (max-width: 899px) {
  .agenda__toolbar {
    min-height: 56px;
    padding: 6px 14px 8px 66px;
    flex-wrap: wrap;
    row-gap: 6px;
  }

  .agenda__toolbar-left {
    gap: 8px;
  }

  .agenda__title {
    font-size: 15px;
  }

  .agenda__employee {
    flex: 1 1 140px;
    max-width: 170px;
  }

  .agenda__content {
    padding: 10px;
    overflow-y: auto;
  }

  .agenda__window-item {
    min-height: 480px;
  }

  .agenda__card {
    padding: 14px;
  }
}

@media (max-width: 599px) {
  .agenda__toolbar {
    padding: 6px 10px 8px 64px;
  }

  .agenda__mode :deep(.v-btn) {
    padding: 0 8px;
    font-size: 11px;
  }

  .agenda__tabs :deep(.v-tab) {
    padding: 0 8px;
    font-size: 11px;
  }

  .agenda__window-item {
    min-height: 430px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .agenda__mode :deep(.v-btn),
  .agenda__tabs :deep(.v-tab),
  .agenda__utility.v-btn {
    transition: none !important;
  }
}
</style>
