<template>
  <div>
    <PageHeader :title="submoduleTitle" />

    <v-card v-if="tabKey === 'reservas'">
      <v-card-text class="pa-4">
        <div class="d-flex justify-center mb-4">
          <v-btn-toggle
            v-model="viewSegment"
            density="compact"
            mandatory
            rounded="lg"
            color="primary"
          >
            <v-btn value="dia">Día</v-btn>
            <v-btn value="semana">Semana</v-btn>
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

        <template v-else>
          <div class="d-flex align-center ga-2 mb-4 flex-wrap">
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
          </div>

          <v-card class="mb-4 pa-4">
            <v-row>
              <v-col cols="12" sm="4">
                <v-text-field
                  v-model="filters.date"
                  label="Fecha"
                  type="date"
                  density="compact"
                  hide-details
                  clearable
                />
              </v-col>
              <v-col cols="12" sm="4">
                <v-select
                  v-model="filters.employee_id"
                  :items="employeeOptions"
                  item-title="text"
                  item-value="value"
                  label="Empleado"
                  density="compact"
                  hide-details
                  clearable
                />
              </v-col>
              <v-col cols="12" sm="4">
                <v-select
                  v-model="filters.status"
                  :items="statusOptions"
                  item-title="text"
                  item-value="value"
                  label="Estado"
                  density="compact"
                  hide-details
                  clearable
                />
              </v-col>
            </v-row>
          </v-card>

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

    <v-card v-else>
      <v-card-text class="pa-4">
        <v-card class="mb-4 pa-4">
          <v-row>
            <v-col cols="12" sm="6">
              <v-select
                v-model="closureEmployeeId"
                :items="employeeOptions"
                item-title="text"
                item-value="value"
                label="Empleado"
                density="compact"
                hide-details
                clearable
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="closureDate"
                label="Fecha"
                type="date"
                density="compact"
                hide-details
              />
            </v-col>
          </v-row>
        </v-card>

        <DailyClosurePanel
          ref="closurePanelRef"
          :employee-id="closureEmployeeId"
          :date="closureDate"
          :tenant-id="tenantId"
          @mark-attended="onMarkAttended"
          @mark-no-show="onMarkNoShow"
          @mark-all-attended="onMarkAllAttended"
          @remove-extra="onRemoveExtra"
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
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
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
import type { WeekDayCount } from '../components/WeekDayStrip.vue';
import { dailyExtrasRepository } from '../repositories/daily-extras.repository';
import { bookingRepository } from '../repositories/booking.repository';
import { useTenantStore } from '@/shared/stores/tenant.store';
import { useAuthStore } from '@/shared/stores/auth.store';
import type { Booking, CreateBookingDTO, WaitlistEntry, DailyExtra } from '../types/booking.types';

const bookingStore = useBookingStore();
const employeeStore = useEmployeeStore();
const tenantStore = useTenantStore();
const authStore = useAuthStore();
const notification = useNotification();
const route = useRoute();
const router = useRouter();

const reservasTab = ref<'all' | 'approval'>('all');
const viewSegment = ref<'dia' | 'semana'>('dia');
const weekAnchor = ref(new Date().toISOString().split('T')[0]);
const weekLoading = ref(false);
const weekCounts = ref<Record<string, WeekDayCount>>({});
const showForm = ref(false);
const showDetail = ref(false);
const selectedBooking = ref<Booking | null>(null);
const editingBooking = ref<Booking | null>(null);
const closurePanelRef = ref<InstanceType<typeof DailyClosurePanel> | null>(null);
const pendingWaitlistConversion = ref<WaitlistEntry | null>(null);
const closureDate = ref(new Date().toISOString().split('T')[0]);
const closureEmployeeId = ref<string | null>(null);
const isEmployeeView = computed(() => authStore.userRole === 'employee');
const myEmployeeId = ref<string | null>(null);

const filters = reactive({
  date: new Date().toISOString().split('T')[0] as string | null,
  employee_id: null as string | null,
  status: null as string | null,
});

const tabKey = computed<'reservas' | 'espera' | 'cierre'>(() => {
  const t = route.query.tab;
  return t === 'espera' || t === 'cierre' ? t : 'reservas';
});

const submoduleTitle = computed(() => {
  switch (tabKey.value) {
    case 'espera': return 'Espera';
    case 'cierre': return 'Cierre';
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

const statusOptions = [
  { value: 'confirmed', text: 'Confirmada' },
  { value: 'in_progress', text: 'En Progreso' },
  { value: 'completed', text: 'Completada' },
  { value: 'no_show', text: 'No Asistió' },
  { value: 'cancelled', text: 'Cancelada' },
  { value: 'pending_approval', text: 'Pendiente Aprobación' },
  { value: 'pending_confirmation', text: 'Pendiente Confirmación' },
];

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

watch(() => viewSegment.value, (segment) => {
  if (segment === 'semana') loadWeekCounts();
});

watch(() => filters.employee_id, () => {
  if (viewSegment.value === 'semana') loadWeekCounts();
});

watch(weekAnchor, () => {
  if (viewSegment.value === 'semana') loadWeekCounts();
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
    closureEmployeeId.value = myEmployeeId.value;
    filters.employee_id = myEmployeeId.value;
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
    status: filters.status as Booking['status'] | null,
  });
  if (tabKey.value === 'reservas') bookingStore.fetchBookings();
}, { deep: true });

async function loadForTab(tab: string) {
  if (tab === 'reservas') {
    await bookingStore.fetchBookings({
      date: filters.date ?? undefined,
      employee_id: filters.employee_id,
      status: filters.status as Booking['status'] | null,
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
