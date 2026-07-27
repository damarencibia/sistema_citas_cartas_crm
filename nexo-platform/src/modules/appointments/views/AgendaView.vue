<template>
  <div>
    <PageHeader title="Agenda" subtitle="Gestiona las citas del día">
      <template #actions>
        <v-btn color="primary" size="small" @click="showForm = true">
          <v-icon start size="18">mdi-plus</v-icon>
          <span class="d-none-mobile">Nueva Cita</span>
        </v-btn>
      </template>
    </PageHeader>

    <v-row>
      <v-col cols="12" md="9">
        <v-card class="pa-4 mb-4">
          <div class="d-flex align-center ga-3 mb-4 flex-wrap">
            <v-select
              v-model="agenda.selectedEmployeeId.value"
              :items="employeeOptions"
              item-title="text"
              item-value="value"
              label="Empleado"
              density="comfortable"
              hide-details
              clearable
              style="min-width: 220px; max-width: 300px;"
            />
          </div>

          <BookingCalendar
            :bookings="agenda.agendaBookings.value"
            :current-date="agenda.selectedDate.value"
            :view="agenda.viewMode.value"
            @update:date="agenda.setDate"
            @update:view="agenda.setView"
            @detail="openDetail"
          />
        </v-card>
      </v-col>

      <v-col cols="12" md="3">
        <v-card class="mb-4">
          <v-tabs v-model="sideTab" density="compact" grow>
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

          <v-tabs-window v-model="sideTab">
            <v-tabs-window-item value="waitlist">
              <WaitlistPanel
                :entries="bookingStore.waitlist"
                :loading="bookingStore.waitlistLoading"
                @cancel="onWaitlistCancel"
              />
            </v-tabs-window-item>
            <v-tabs-window-item value="closure">
              <DailyClosurePanel
                ref="closurePanelRef"
                :employee-id="agenda.selectedEmployeeId.value"
                :date="agenda.selectedDate.value"
                :tenant-id="tenantId"
                class="pa-3"
                @mark-attended="onMarkAttended"
                @mark-no-show="onMarkNoShow"
                @remove-extra="onRemoveExtra"
              />
            </v-tabs-window-item>
          </v-tabs-window>
        </v-card>
      </v-col>
    </v-row>

    <BookingForm
      :visible="showForm"
      @close="showForm = false"
      @save="onCreateBooking"
    />

    <BookingDetailDialog
      :visible="showDetail"
      :booking="selectedBooking"
      show-actions
      @close="showDetail = false"
      @status-change="onStatusChange"
      @cancel="onCancelBooking"
      @reassign="onReassignBooking"
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
const sideTab = ref('waitlist');
const closurePanelRef = ref<InstanceType<typeof DailyClosurePanel> | null>(null);

const tenantId = computed(() => tenantStore.tenant?.id ?? '');

const employeeOptions = computed(() =>
  employeeStore.activeEmployees.map((e) => ({
    value: e.id,
    text: `${e.first_name} ${e.last_name}`,
  })),
);

onMounted(async () => {
  await employeeStore.fetchEmployees();
  await agenda.loadAgenda();
  await bookingStore.fetchWaitlist();
});

watch([agenda.selectedDate, agenda.viewMode, agenda.selectedEmployeeId], () => {
  agenda.loadAgenda();
});

function openDetail(booking: Booking) {
  selectedBooking.value = booking;
  showDetail.value = true;
}

async function onCreateBooking(data: CreateBookingDTO) {
  try {
    await bookingStore.createBooking(data);
    showForm.value = false;
    await agenda.loadAgenda();
    notification.success('Reserva creada');
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
  } catch {
    notification.error('Error al actualizar');
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

// Waitlist handler
async function onWaitlistCancel(entry: WaitlistEntry) {
  try {
    await bookingStore.cancelWaitlistEntry(entry.id);
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
    await agenda.loadAgenda();
    closurePanelRef.value?.loadExtras();
  } catch {
    notification.error('Error al actualizar estado');
  }
}

async function onMarkNoShow(booking: Booking) {
  try {
    await bookingStore.updateStatus(booking.id, 'no_show');
    notification.success(`${booking.customer_name || 'Cliente'} marcado como no asistido`);
    await agenda.loadAgenda();
    closurePanelRef.value?.loadExtras();
  } catch {
    notification.error('Error al actualizar estado');
  }
}

async function onRemoveExtra(extra: DailyExtra) {
  try {
    await dailyExtrasRepository.remove(extra.id);
    notification.success('Extra eliminado');
    closurePanelRef.value?.loadExtras();
  } catch {
    notification.error('Error al eliminar extra');
  }
}
</script>
