<template>
  <div>
    <PageHeader :title="submoduleTitle" />

    <v-card v-if="tabKey === 'reservas'">
      <v-card-text class="pa-4">
        <div class="d-flex align-center justify-center ga-4 mb-4 flex-wrap">
          <v-select
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
            v-model="viewSegment"
            density="compact"
            mandatory
            rounded="lg"
            color="primary"
          >
            <v-btn value="dia">Día</v-btn>
            <v-btn value="semana">Semana</v-btn>
            <v-btn value="mes">Mes</v-btn>
          </v-btn-toggle>
        </div>

        <template v-if="viewSegment === 'semana'">
          <WeekDayStrip
            :week-dates="weekDates"
            :counts="weekCounts"
            :selected-date="filters.date"
            :loading="weekLoading"
            @select-date="onSelectWeekDay"
            @prev-week="shiftWeek(-7)"
            @next-week="shiftWeek(7)"
            @today="goToTodayWeek"
          />
        </template>

        <template v-else-if="viewSegment === 'mes'">
          <MonthCalendar
            :month-anchor="monthAnchor"
            :counts="monthCounts"
            :selected-date="filters.date"
            :loading="monthLoading"
            @select-date="onSelectMonthDay"
            @prev-month="shiftMonth(-1)"
            @next-month="shiftMonth(1)"
            @today="goToTodayMonth"
          />
        </template>

        <template v-else>
          <div class="d-flex align-center justify-space-between ga-2 mb-4 flex-wrap">
            <v-tabs v-model="reservasTab" density="compact" color="primary">
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
            <span v-if="filters.date" class="text-subtitle-2 text-medium-emphasis">
              Reservas del {{ formatDate(filters.date) }}
            </span>
            <v-btn
              size="small"
              color="primary"
              variant="tonal"
              :prepend-icon="dayClosed ? 'mdi-clipboard-text-outline' : 'mdi-clipboard-check-outline'"
              :disabled="!filters.employee_id"
              :title="
                dayClosed
                  ? 'Ver el resumen del cierre del día'
                  : filters.employee_id
                    ? 'Abrir el cierre del día'
                    : 'Selecciona un empleado para cerrar el día'
              "
              @click="openClosure"
            >
              {{ dayClosed ? 'Ver Resumen' : 'Cerrar Día' }}
            </v-btn>
          </div>

          <v-tabs-window v-model="reservasTab">
            <v-tabs-window-item value="all">
              <div v-if="bookingStore.loading" class="text-center pa-8">
                <v-progress-circular indeterminate color="primary" />
              </div>

              <div v-else-if="bookingStore.bookings.length === 0" class="text-center pa-8">
                <v-icon size="64" color="medium-emphasis">mdi-calendar-blank</v-icon>
                <p class="text-body-1 text-medium-emphasis mt-4">No hay reservas</p>
              </div>

              <template v-else>
                <BookingCard
                  v-for="booking in bookingStore.bookings"
                  :key="booking.id"
                  :booking="booking"
                  @detail="openDetail"
                />
              </template>
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
          @convert="onWaitlistConvert"
        />
      </v-card-text>
    </v-card>

    <BookingForm
      :visible="showForm"
      :booking="editingBooking"
      @close="closeForm"
      @save="onSaveBooking"
    />

    <BookingDetailDialog
      :visible="showDetail"
      :booking="selectedBooking"
      show-actions
      @close="showDetail = false"
      @status-change="onStatusChange"
      @cancel="onCancelBooking"
      @reassign="onReassignBooking"
      @delete="onDeleteBooking"
      @edit="onEditBooking"
    />

    <v-dialog
      v-if="smAndDown"
      v-model="showClosure"
      fullscreen
      class="closure-dialog"
    >
      <v-card class="d-flex flex-column h-100">
        <v-toolbar density="compact" color="transparent" class="flex-shrink-0">
          <v-icon color="primary" class="ml-4">mdi-clipboard-check-outline</v-icon>
          <v-toolbar-title class="text-subtitle-1 font-weight-semibold ml-1">
            Cierre del Día
          </v-toolbar-title>
          <v-spacer />
          <v-btn
            icon="mdi-close"
            size="small"
            variant="text"
            aria-label="Cerrar cierre del día"
            @click="showClosure = false"
          />
        </v-toolbar>

        <div class="px-4 pb-2 d-flex align-center ga-2 flex-wrap flex-shrink-0">
          <v-chip
            size="small"
            variant="tonal"
            color="primary"
            prepend-icon="mdi-calendar-today"
          >
            {{ filters.date ? formatDate(filters.date) : '' }}
          </v-chip>
          <v-chip size="small" variant="tonal" prepend-icon="mdi-account">
            {{ closureEmployeeName }}
          </v-chip>
        </div>
        <v-divider />

        <div class="flex-grow-1 d-flex flex-column closure-dialog__body">
          <DailyClosurePanel
            ref="closurePanelRef"
            :employee-id="filters.employee_id"
            :date="filters.date ?? ''"
            :tenant-id="tenantId"
            @mark-attended="onMarkAttended"
            @mark-no-show="onMarkNoShow"
            @mark-all-attended="onMarkAllAttended"
            @remove-extra="onRemoveExtra"
            @closure-changed="dayClosed = $event"
            @close-dialog="showClosure = false"
          />
        </div>
      </v-card>
    </v-dialog>

    <v-navigation-drawer
      v-else
      v-model="showClosure"
      temporary
      location="right"
      width="600"
      :scrim="false"
      class="closure-drawer"
      :style="{ position: 'fixed', top: '0', height: '100dvh', zIndex: 1001 }"
    >
      <div class="d-flex flex-column h-100">
        <v-toolbar density="compact" color="transparent" class="flex-shrink-0">
          <v-icon color="primary" class="ml-4">mdi-clipboard-check-outline</v-icon>
          <v-toolbar-title class="text-subtitle-1 font-weight-semibold ml-1">
            Cierre del Día
          </v-toolbar-title>
          <v-spacer />
          <v-btn
            icon="mdi-close"
            size="small"
            variant="text"
            aria-label="Cerrar cierre del día"
            @click="showClosure = false"
          />
        </v-toolbar>

        <div class="px-4 pb-2 d-flex align-center ga-2 flex-wrap flex-shrink-0">
          <v-chip
            size="small"
            variant="tonal"
            color="primary"
            prepend-icon="mdi-calendar-today"
          >
            {{ filters.date ? formatDate(filters.date) : '' }}
          </v-chip>
          <v-chip size="small" variant="tonal" prepend-icon="mdi-account">
            {{ closureEmployeeName }}
          </v-chip>
        </div>
        <v-divider />

        <div class="flex-grow-1 d-flex flex-column closure-dialog__body">
          <DailyClosurePanel
            ref="closurePanelRef"
            :employee-id="filters.employee_id"
            :date="filters.date ?? ''"
            :tenant-id="tenantId"
            @mark-attended="onMarkAttended"
            @mark-no-show="onMarkNoShow"
            @mark-all-attended="onMarkAllAttended"
            @remove-extra="onRemoveExtra"
            @closure-changed="dayClosed = $event"
            @close-dialog="showClosure = false"
          />
        </div>
      </div>
    </v-navigation-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useDisplay } from 'vuetify';
import PageHeader from '@/shared/components/PageHeader.vue';
import { useNotification } from '@/shared/composables/useNotification';
import { useBookingStore } from '../stores/booking.store';
import { useEmployeeStore } from '../stores/employee.store';
import BookingCard from '../components/BookingCard.vue';
import BookingForm from '../components/BookingForm.vue';
import BookingDetailDialog from '../components/BookingDetailDialog.vue';
import BookingApprovalList from '../components/BookingApprovalList.vue';
import WaitlistPanel from '../components/WaitlistPanel.vue';
import DailyClosurePanel from '../components/DailyClosurePanel.vue';
import WeekDayStrip from '../components/WeekDayStrip.vue';
import MonthCalendar from '../components/MonthCalendar.vue';
import type { WeekDayCount } from '../components/WeekDayStrip.vue';
import { dailyExtrasRepository } from '../repositories/daily-extras.repository';
import { dailyClosureRepository } from '../repositories/daily-closure.repository';
import { bookingRepository } from '../repositories/booking.repository';
import { useTenantStore } from '@/shared/stores/tenant.store';
import { useAuthStore } from '@/shared/stores/auth.store';
import { formatDate } from '@/shared/utils/format';
import type { Booking, CreateBookingDTO, WaitlistEntry, DailyExtra } from '../types/booking.types';

const bookingStore = useBookingStore();
const employeeStore = useEmployeeStore();
const tenantStore = useTenantStore();
const authStore = useAuthStore();
const notification = useNotification();
const route = useRoute();
const router = useRouter();
const { smAndDown } = useDisplay();

const reservasTab = ref<'all' | 'approval'>('all');
const viewSegment = ref<'dia' | 'semana' | 'mes'>('dia');
const weekAnchor = ref(new Date().toISOString().split('T')[0]);
const weekLoading = ref(false);
const weekCounts = ref<Record<string, WeekDayCount>>({});
const monthAnchor = ref(new Date().toISOString().split('T')[0]);
const monthLoading = ref(false);
const monthCounts = ref<Record<string, WeekDayCount>>({});
const showForm = ref(false);
const showDetail = ref(false);
const showClosure = ref(false);
const dayClosed = ref(false);
const selectedBooking = ref<Booking | null>(null);
const editingBooking = ref<Booking | null>(null);
const closurePanelRef = ref<InstanceType<typeof DailyClosurePanel> | null>(null);
const pendingWaitlistConversion = ref<WaitlistEntry | null>(null);
const isEmployeeView = computed(() => authStore.userRole === 'employee');
const myEmployeeId = ref<string | null>(null);

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
    default: return 'Reservas';
  }
});

const tenantId = computed(() => tenantStore.tenant?.id ?? '');

const employeeOptions = computed(() =>
  employeeStore.activeEmployees.map((e) => ({
    value: e.id,
    text: `${e.first_name} ${e.last_name}`,
  })),
);

const closureEmployeeName = computed(() => {
  if (!filters.employee_id) return 'Sin empleado';
  const emp = employeeStore.employees.find((e) => e.id === filters.employee_id);
  return emp ? `${emp.first_name} ${emp.last_name}` : 'Empleado';
});

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

const weekDates = computed(() => {
  const d = new Date(weekAnchor.value + 'T12:00:00');
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const dd = new Date(d);
    dd.setDate(d.getDate() + i);
    dates.push(dd.toISOString().split('T')[0]);
  }
  return dates;
});

async function loadWeekCounts() {
  weekLoading.value = true;
  try {
    const [start, end] = [weekDates.value[0], weekDates.value[6]];
    const data = await bookingRepository.getByFilters({
      date_from: start,
      date_to: end,
      employee_id: filters.employee_id,
    });
    const counts: Record<string, WeekDayCount> = {};
    for (const b of data) {
      if (b.status === 'cancelled' || b.status === 'no_show') continue;
      counts[b.date] = counts[b.date] ?? { total: 0, pending: 0 };
      counts[b.date].total += 1;
      if (b.status === 'pending_approval') counts[b.date].pending += 1;
    }
    weekCounts.value = counts;
  } finally {
    weekLoading.value = false;
  }
}

function shiftWeek(days: number) {
  const d = new Date(weekAnchor.value + 'T12:00:00');
  d.setDate(d.getDate() + days);
  weekAnchor.value = d.toISOString().split('T')[0];
}

function goToTodayWeek() {
  weekAnchor.value = new Date().toISOString().split('T')[0];
}

function onSelectWeekDay(day: string) {
  filters.date = day;
  viewSegment.value = 'dia';
}

const monthDates = computed(() => {
  const d = new Date(monthAnchor.value + 'T12:00:00');
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return { start: toIsoDate(first), end: toIsoDate(last) };
});

async function loadMonthCounts() {
  monthLoading.value = true;
  try {
    const { start, end } = monthDates.value;
    const data = await bookingRepository.getByFilters({
      date_from: start,
      date_to: end,
      employee_id: filters.employee_id,
    });
    const counts: Record<string, WeekDayCount> = {};
    for (const b of data) {
      if (b.status === 'cancelled' || b.status === 'no_show') continue;
      counts[b.date] = counts[b.date] ?? { total: 0, pending: 0 };
      counts[b.date].total += 1;
      if (b.status === 'pending_approval') counts[b.date].pending += 1;
    }
    monthCounts.value = counts;
  } finally {
    monthLoading.value = false;
  }
}

function shiftMonth(months: number) {
  const d = new Date(monthAnchor.value + 'T12:00:00');
  d.setMonth(d.getMonth() + months);
  monthAnchor.value = toIsoDate(d);
}

function goToTodayMonth() {
  monthAnchor.value = new Date().toISOString().split('T')[0];
}

function onSelectMonthDay(day: string) {
  filters.date = day;
  viewSegment.value = 'dia';
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

watch(() => viewSegment.value, (segment) => {
  if (segment === 'semana') loadWeekCounts();
  if (segment === 'mes') loadMonthCounts();
});

watch(() => filters.employee_id, () => {
  if (viewSegment.value === 'semana') loadWeekCounts();
  if (viewSegment.value === 'mes') loadMonthCounts();
});

watch(() => [filters.employee_id, filters.date], loadDayClosed, { immediate: true });

watch(weekAnchor, () => {
  if (viewSegment.value === 'semana') loadWeekCounts();
});

watch(monthAnchor, () => {
  if (viewSegment.value === 'mes') loadMonthCounts();
});

onMounted(async () => {
  await employeeStore.fetchEmployees();
  if (isEmployeeView.value) {
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
  if (route.query.nueva === '1') {
    openCreateForm();
    await router.replace({ query: { tab: tabKey.value } });
  }
});

watch(() => route.query.tab, (tab) => {
  loadForTab((tab as string) ?? 'reservas');
});

watch(() => route.query.nueva, (nueva) => {
  if (nueva === '1') {
    openCreateForm();
    router.replace({ query: { tab: tabKey.value } });
  }
});

watch(filters, () => {
  bookingStore.setFilters({
    date: filters.date ?? undefined,
    employee_id: filters.employee_id,
  });
  if (tabKey.value === 'reservas') bookingStore.fetchBookings();
}, { deep: true });

async function loadForTab(tab: string) {
  if (tab === 'reservas') {
    await bookingStore.fetchBookings({
      date: filters.date ?? undefined,
      employee_id: filters.employee_id,
    });
  }
}

async function refreshBookings() {
  await bookingStore.fetchBookings();
}

function openCreateForm() {
  pendingWaitlistConversion.value = null;
  editingBooking.value = null;
  showForm.value = true;
}

function closeForm() {
  showForm.value = false;
  editingBooking.value = null;
  pendingWaitlistConversion.value = null;
}

function openDetail(booking: Booking) {
  selectedBooking.value = booking;
  showDetail.value = true;
}

function onEditBooking(booking: Booking) {
  showDetail.value = false;
  editingBooking.value = booking;
  showForm.value = true;
}

async function onSaveBooking(data: CreateBookingDTO) {
  if (editingBooking.value) {
    try {
      await bookingStore.updateBooking(editingBooking.value.id, {
        service_id: data.service_id,
        employee_id: data.employee_id,
        date: data.date,
        start_time: data.start_time,
        customer_name: data.customer_name,
        customer_email: data.customer_email,
        customer_phone: data.customer_phone,
        notes: data.notes,
        custom_duration_minutes: data.custom_duration_minutes,
        participant_count: data.participant_count,
        resource_id: data.resource_id,
        whatsapp_consent: data.whatsapp_consent,
      });
      closeForm();
      notification.success('Reserva actualizada');
      await refreshBookings();
    } catch {
      notification.error('Error al actualizar reserva');
    }
    return;
  }
  await onCreateBooking(data);
}

async function onCreateBooking(data: CreateBookingDTO) {
  try {
    await bookingStore.createBooking(data);
    showForm.value = false;

    if (pendingWaitlistConversion.value) {
      const entry = pendingWaitlistConversion.value;
      pendingWaitlistConversion.value = null;
      try {
        await bookingStore.cancelWaitlistEntry(entry.id);
        await bookingStore.fetchWaitlist();
        notification.success('Reserva creada desde la lista de espera');
      } catch {
        notification.success('Reserva creada');
      }
    } else {
      notification.success('Reserva creada');
    }

    await refreshBookings();
  } catch {
    notification.error('Error al crear reserva');
  }
}

async function onStatusChange(booking: Booking, status: string) {
  try {
    await bookingStore.updateStatus(booking.id, status as 'confirmed' | 'in_progress' | 'completed' | 'no_show' | 'cancelled');
    notification.success('Estado actualizado');
    showDetail.value = false;
    await refreshBookings();
  } catch (e) {
    notification.error((e as Error).message || 'Error al actualizar');
  }
}

async function onCancelBooking(
  booking: Booking,
  reason: string,
  blockOption: 'none' | 'temporary' | 'indefinite',
  blockDays: number,
) {
  try {
    await bookingStore.updateStatus(
      booking.id,
      'cancelled',
      reason || undefined,
      'customer',
    );

    if (blockOption !== 'none' && booking.customer_email) {
      const blockedUntil = new Date();
      if (blockOption === 'temporary') {
        blockedUntil.setDate(blockedUntil.getDate() + blockDays);
      } else {
        blockedUntil.setFullYear(blockedUntil.getFullYear() + 10);
      }
      const tenantId = booking.tenant_id || bookingStore.bookings[0]?.tenant_id;
      if (tenantId) {
        const { bookingRepository } = await import('../repositories/booking.repository');
        const noShowCount = await bookingStore.countRecentNoShows(booking.customer_email);
        await bookingRepository.createClientBlock(
          tenantId,
          booking.customer_email,
          blockedUntil.toISOString().split('T')[0],
          reason || `Bloqueado por cancelación de cita`,
          noShowCount,
        );
      }
    }

    notification.success('Cita cancelada');
    showDetail.value = false;
    await refreshBookings();
  } catch {
    notification.error('Error al cancelar cita');
  }
}

async function onReassignBooking(booking: Booking, newDate: string, newStartTime: string) {
  try {
    const serviceDuration = booking.service?.duration_minutes ?? 30;
    await bookingStore.reassignBooking(booking.id, newDate, newStartTime, serviceDuration);
    notification.success('Cita reasignada');
    showDetail.value = false;
    await refreshBookings();
  } catch {
    notification.error('Error al reasignar cita');
  }
}

async function onDeleteBooking(booking: Booking) {
  try {
    await bookingStore.hardDeleteBooking(booking.id);
    notification.success('Cita eliminada permanentemente');
    showDetail.value = false;
    await refreshBookings();
  } catch {
    notification.error('Error al eliminar cita');
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
    notification.success('Entrada de waitlist cancelada');
  } catch {
    notification.error('Error al cancelar waitlist');
  }
}

function onWaitlistConvert(entry: WaitlistEntry) {
  pendingWaitlistConversion.value = entry;
  editingBooking.value = null;
  showForm.value = true;
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
.closure-dialog__body {
  min-height: 0;
}
</style>

<style>
.closure-drawer {
  position: fixed !important;
  top: 0 !important;
  height: 100vh !important;
  height: 100dvh !important;
  z-index: 1001 !important;
  transition-property: transform !important;
  transition-duration: 0.35s !important;
  transition-timing-function: cubic-bezier(0.22, 1, 0.36, 1) !important;
  will-change: transform;
  box-shadow: none !important;
  border-right: none !important;
  border-left: 1px solid rgb(var(--v-border)) !important;
}

.closure-drawer :deep(.v-navigation-drawer__content) {
  overscroll-behavior: contain;
}
</style>
