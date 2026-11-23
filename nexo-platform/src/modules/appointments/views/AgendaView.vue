<template>
  <div>
    <PageHeader :title="submoduleTitle" />

    <v-card v-if="tabKey === 'reservas'">
      <!-- Filtros y tabs en una sola fila para aprovechar el alto (se apilan solos en móvil) -->
      <v-card-text class="pa-3 pa-sm-4">
        <div class="d-flex align-start ga-2 mb-3 flex-wrap">
          <v-select
            v-if="!workspaceStore.isWorkMode"
            v-model="filters.employee_id"
            :items="employeeOptions"
            item-title="text"
            item-value="value"
            label="Empleado"
            density="compact"
            hide-details
            style="max-width: 240px;"
          />
          <v-btn-toggle
            v-if="!workspaceStore.isWorkMode && !teamView"
            :model-value="teamView ? 'equipo' : 'individual'"
            density="compact"
            mandatory
            rounded="lg"
            color="primary"
            @update:model-value="setLayoutMode($event as 'equipo' | 'individual')"
          >
            <v-btn value="equipo">Equipo</v-btn>
            <v-btn value="individual">Individual</v-btn>
          </v-btn-toggle>

          <v-tabs
            v-if="!showTeamBoard"
            v-model="reservasTab"
            density="compact"
            color="primary"
            class="align-self-start"
            :class="{ 'ml-auto': !workspaceStore.isWorkMode }"
          >
            <v-tab value="all">Todas</v-tab>
            <v-tab value="approval">
              Pendientes de Aprobación
              <v-badge
                v-if="bookingStore.pendingApprovalBookings.length > 0"
                :content="bookingStore.pendingApprovalBookings.length"
                color="amber"
                inline
                class="ml-2"
              />
            </v-tab>
          </v-tabs>
        </div>

        <template v-if="showTeamBoard">
          <TeamScheduleBoard
            :date="filters.date ?? ''"
            :employees="employeeStore.activeEmployees"
            @change-date="onSelectUnifiedDay"
            @open-booking="openDetail"
            @select-employee="onTeamSelectEmployee"
          />
        </template>

        <template v-else>
          <v-tabs-window v-model="reservasTab">
            <v-tabs-window-item value="all">
              <MonthlyAgendaBoard
                :month-anchor="monthAnchor"
                :dates="monthDates"
                :bookings="monthBookings"
                :closed-dates="monthClosedDates"
                :selected-date="filters.date"
                :loading="monthLoading"
                :employee-names="employeeNamesById"
                :can-close="!!filters.employee_id"
                :blocked-slots="dayBlocks"
                @select-date="onSelectUnifiedDay"
                @prev-month="shiftMonth(-1)"
                @next-month="shiftMonth(1)"
                @prev-year="shiftYear(-1)"
                @next-year="shiftYear(1)"
                @today="goToTodayMonth"
                @open-booking="openDetail"
                @open-block="onReleaseBlock"
                @open-closure="openClosure"
                @go-approval="reservasTab = 'approval'"
              />
            </v-tabs-window-item>

            <v-tabs-window-item value="approval">
              <BookingApprovalList
                :bookings="bookingStore.pendingApprovalBookings"
                @approve="onApproveBooking"
                @reject="onRejectBooking"
              />
            </v-tabs-window-item>
          </v-tabs-window>
        </template>
      </v-card-text>
    </v-card>

    <v-card v-else-if="tabKey === 'espera'">
      <v-card-text class="pa-4">
        <WaitlistPanel
          :entries="bookingStore.waitlist"
          :loading="bookingStore.waitlistLoading"
          @cancel="onWaitlistCancel"
        />
      </v-card-text>
    </v-card>

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
import { formatDate } from '@/shared/utils/format';
import PageHeader from '@/shared/components/PageHeader.vue';
import { useNotification } from '@/shared/composables/useNotification';
import { useBookingStore } from '../stores/booking.store';
import { useEmployeeStore } from '../stores/employee.store';
import BookingDetailDrawer from '../components/BookingDetailDrawer.vue';
import BookingApprovalList from '../components/BookingApprovalList.vue';
import WaitlistPanel from '../components/WaitlistPanel.vue';
import DailyClosurePanel from '../components/DailyClosurePanel.vue';
import DetailDialog from '../components/DetailDialog.vue';
import MonthlyAgendaBoard from '../components/MonthlyAgendaBoard.vue';
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

const bookingStore = useBookingStore();
const employeeStore = useEmployeeStore();
const tenantStore = useTenantStore();
const authStore = useAuthStore();
const uiStore = useUiStore();
const notification = useNotification();
const route = useRoute();
const router = useRouter();

const reservasTab = ref<'all' | 'approval'>('all');
const monthAnchor = ref(new Date().toISOString().split('T')[0]);
const monthLoading = ref(false);
/** Reservas del mes visible (para la grilla y el panel del día) */
const monthBookings = ref<Booking[]>([]);
/** Fechas del mes visible con cierre vigente */
const monthClosedDates = ref<string[]>([]);
const dayBlocks = ref<BlockedSlot[]>([]);
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

function setLayoutMode(mode: 'equipo' | 'individual') {
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
  loadForTab((tab as string) ?? 'reservas');
});

watch(() => route.query.vista, (vista) => {
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
