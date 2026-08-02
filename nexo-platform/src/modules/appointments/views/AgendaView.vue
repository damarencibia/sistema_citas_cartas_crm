<template>
  <div>
    <PageHeader title="Agenda" subtitle="Gestiona las citas del día">
      <template #actions>
        <v-btn color="primary" size="small" @click="openCreateForm">
          <v-icon start size="18">mdi-plus</v-icon>
          <span class="d-none-mobile">Nueva Cita</span>
        </v-btn>
      </template>
    </PageHeader>

    <v-card>
      <v-tabs
        v-model="activeTab"
        grow
        color="primary"
        class="px-2 pt-1"
      >
        <v-tab value="agenda">
          <v-icon start size="small">mdi-calendar-month</v-icon>
          Agenda
        </v-tab>
        <v-tab value="waitlist">
          <v-icon start size="small">mdi-clock-outline</v-icon>
          Espera
          <v-badge
            v-if="bookingStore.waitlist.length"
            :content="bookingStore.waitlist.length"
            color="amber"
            inline
            class="ml-1"
          />
        </v-tab>
        <v-tab value="closure">
          <v-icon start size="small">mdi-clipboard-check-outline</v-icon>
          Cierre
        </v-tab>
      </v-tabs>

      <v-divider />

      <v-tabs-window v-model="activeTab">
        <v-tabs-window-item value="agenda" class="pa-4">
          <div class="d-flex align-center ga-3 mb-4 flex-wrap">
            <v-select
              v-if="!agenda.isEmployeeView.value"
              v-model="agenda.selectedEmployeeId.value"
              :items="employeeOptions"
              item-title="text"
              item-value="value"
              label="Empleado"
              density="comfortable"
              hide-details
              clearable
              clear-text="Todos los empleados"
              style="min-width: 220px; max-width: 300px;"
            >
              <template #item="{ props, item }">
                <v-list-item
                  v-bind="props"
                  :title="item.raw.text"
                  :subtitle="item.raw.role"
                >
                  <template #prepend>
                    <v-avatar :color="item.raw.color" size="28" variant="tonal">
                      {{ item.raw.initials }}
                    </v-avatar>
                  </template>
                </v-list-item>
              </template>
            </v-select>

            <v-chip
              v-else
              color="primary"
              variant="tonal"
              prepend-icon="mdi-account-badge-outline"
            >
              Mi agenda
            </v-chip>

            <v-spacer />
            <v-chip
              v-if="!agenda.isEmployeeView.value && agenda.selectedEmployeeId.value"
              color="info"
              variant="tonal"
              size="small"
            >
              {{ selectedEmployeeName }}
            </v-chip>
          </div>

          <BookingCalendar
            :bookings="agenda.agendaBookings.value"
            :current-date="agenda.selectedDate.value"
            :view="agenda.viewMode.value"
            @update:date="agenda.setDate"
            @update:view="agenda.setView"
            @detail="openDetail"
          />
        </v-tabs-window-item>

        <v-tabs-window-item value="waitlist" class="pa-4">
          <WaitlistPanel
            :entries="bookingStore.waitlist"
            :loading="bookingStore.waitlistLoading"
            @cancel="onWaitlistCancel"
            @convert="onWaitlistConvert"
          />
        </v-tabs-window-item>

        <v-tabs-window-item value="closure" class="pa-4">
          <DailyClosurePanel
            ref="closurePanelRef"
            :employee-id="agenda.selectedEmployeeId.value"
            :date="agenda.selectedDate.value"
            :tenant-id="tenantId"
            @mark-attended="onMarkAttended"
            @mark-no-show="onMarkNoShow"
            @mark-all-attended="onMarkAllAttended"
            @remove-extra="onRemoveExtra"
          />
        </v-tabs-window-item>
      </v-tabs-window>
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
import { ref, computed, onMounted, watch } from 'vue';
import PageHeader from '@/shared/components/PageHeader.vue';
import { useNotification } from '@/shared/composables/useNotification';
import { useBookingStore } from '../stores/booking.store';
import { useEmployeeStore } from '../stores/employee.store';
import { useAgenda } from '../composables/useAgenda';
import BookingCalendar from '../components/BookingCalendar.vue';
import BookingForm from '../components/BookingForm.vue';
import BookingDetailDialog from '../components/BookingDetailDialog.vue';
import WaitlistPanel from '../components/WaitlistPanel.vue';
import DailyClosurePanel from '../components/DailyClosurePanel.vue';
import { dailyExtrasRepository } from '../repositories/daily-extras.repository';
import { useTenantStore } from '@/shared/stores/tenant.store';
import type { Booking, CreateBookingDTO, WaitlistEntry, DailyExtra } from '../types/booking.types';

const bookingStore = useBookingStore();
const employeeStore = useEmployeeStore();
const tenantStore = useTenantStore();
const notification = useNotification();
const agenda = useAgenda();

const showForm = ref(false);
const showDetail = ref(false);
const selectedBooking = ref<Booking | null>(null);
const editingBooking = ref<Booking | null>(null);
const activeTab = ref('agenda');
const closurePanelRef = ref<InstanceType<typeof DailyClosurePanel> | null>(null);
const pendingWaitlistConversion = ref<WaitlistEntry | null>(null);

const tenantId = computed(() => tenantStore.tenant?.id ?? '');

const employeeOptions = computed(() =>
  employeeStore.activeEmployees.map((e) => ({
    value: e.id,
    text: `${e.first_name} ${e.last_name}`,
    role: e.role && e.role !== 'employee' ? e.role : 'Empleado',
    color: e.color,
    initials: `${e.first_name[0] ?? ''}${e.last_name[0] ?? ''}`.toUpperCase(),
  })),
);

const selectedEmployeeName = computed(() => {
  const id = agenda.selectedEmployeeId.value;
  if (!id) return '';
  const emp = employeeStore.employees.find((e) => e.id === id);
  return emp ? `${emp.first_name} ${emp.last_name}` : '';
});

onMounted(async () => {
  await employeeStore.fetchEmployees();
  await agenda.assignCurrentEmployee();
  await agenda.loadAgenda();
  await bookingStore.fetchWaitlist();
});

watch([agenda.selectedDate, agenda.viewMode, agenda.selectedEmployeeId], () => {
  agenda.loadAgenda();
});

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
      await agenda.loadAgenda();
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

    await agenda.loadAgenda();
  } catch {
    notification.error('Error al crear reserva');
  }
}

async function onStatusChange(booking: Booking, status: string) {
  try {
    await bookingStore.updateStatus(booking.id, status as 'confirmed' | 'in_progress' | 'completed' | 'no_show' | 'cancelled');
    notification.success('Estado actualizado');
    showDetail.value = false;
    await agenda.loadAgenda();
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
      const tenantId = bookingStore.bookings[0]?.tenant_id;
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
    await agenda.loadAgenda();
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
    await agenda.loadAgenda();
  } catch {
    notification.error('Error al reasignar cita');
  }
}

async function onDeleteBooking(booking: Booking) {
  try {
    await bookingStore.hardDeleteBooking(booking.id);
    notification.success('Cita eliminada permanentemente');
    showDetail.value = false;
    await agenda.loadAgenda();
  } catch {
    notification.error('Error al eliminar cita');
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
    await agenda.loadAgenda();
    closurePanelRef.value?.loadExtras();
  } catch (e) {
    notification.error((e as Error).message || 'Error al actualizar estado');
  }
}

async function onMarkNoShow(booking: Booking) {
  try {
    await bookingStore.updateStatus(booking.id, 'no_show');
    notification.success(`${booking.customer_name || 'Cliente'} marcado como no asistido`);
    await agenda.loadAgenda();
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
    await agenda.loadAgenda();
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
