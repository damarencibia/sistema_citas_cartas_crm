<template>
  <div>
    <PageHeader title="Agenda" subtitle="Gestiona las citas del día">
      <template #actions>
        <v-btn variant="tonal" size="small" class="mr-2 d-none-mobile" @click="showWalkInDialog = true">
          <v-icon start size="18">mdi-walk</v-icon>
          Walk-in
        </v-btn>
        <v-btn
          variant="tonal"
          size="small"
          icon
          class="d-md-none"
          @click="showWalkInDialog = true"
        >
          <v-icon size="18">mdi-walk</v-icon>
        </v-btn>
        <v-btn color="primary" size="small" @click="showForm = true">
          <v-icon start size="18">mdi-plus</v-icon>
          <span class="d-none-mobile">Nueva Cita</span>
        </v-btn>
      </template>
    </PageHeader>

    <v-row>
      <v-col cols="12" md="9">
        <v-card class="pa-4 mb-4">
          <div class="d-flex align-center ga-2 mb-4 flex-wrap">
            <v-select
              v-model="agenda.selectedEmployeeId.value"
              :items="employeeOptions"
              item-title="text"
              item-value="value"
              label="Empleado"
              density="compact"
              hide-details
              clearable
              class="flex-grow-0"
              style="max-width: 250px;"
            />
            <v-spacer class="d-none-mobile" />
            <v-btn-toggle
              v-model="agenda.viewMode.value"
              mandatory
              density="compact"
              color="primary"
            >
              <v-btn value="day" size="small">Día</v-btn>
              <v-btn value="week" size="small">Semana</v-btn>
            </v-btn-toggle>
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
            <v-tab value="walkin">
              <v-icon start size="small">mdi-walk</v-icon>
              Walk-in
              <v-badge
                v-if="bookingStore.walkInQueue.length"
                :content="bookingStore.walkInQueue.length"
                color="primary"
                inline
                class="ml-1"
              />
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
          </v-tabs>

          <v-divider />

          <v-tabs-window v-model="sideTab">
            <v-tabs-window-item value="walkin">
              <WalkInQueuePanel
                :entries="bookingStore.walkInQueue"
                :loading="bookingStore.walkInLoading"
                @start-serving="onWalkInStartServing"
                @complete="onWalkInComplete"
                @cancel="onWalkInCancel"
              />
            </v-tabs-window-item>
            <v-tabs-window-item value="waitlist">
              <WaitlistPanel
                :entries="bookingStore.waitlist"
                :loading="bookingStore.waitlistLoading"
                @cancel="onWaitlistCancel"
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

    <WalkInDialog
      :visible="showWalkInDialog"
      @close="showWalkInDialog = false"
      @save="onWalkInSave"
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
import WalkInDialog from '../components/WalkInDialog.vue';
import WalkInQueuePanel from '../components/WalkInQueuePanel.vue';
import WaitlistPanel from '../components/WaitlistPanel.vue';
import type { Booking, CreateBookingDTO, CreateWalkInDTO, WalkInEntry, WaitlistEntry } from '../types/booking.types';

const bookingStore = useBookingStore();
const employeeStore = useEmployeeStore();
const notification = useNotification();
const agenda = useAgenda();

const showForm = ref(false);
const showDetail = ref(false);
const showWalkInDialog = ref(false);
const selectedBooking = ref<Booking | null>(null);
const sideTab = ref('walkin');

const employeeOptions = computed(() =>
  employeeStore.activeEmployees.map((e) => ({
    value: e.id,
    text: `${e.first_name} ${e.last_name}`,
  })),
);

onMounted(async () => {
  await employeeStore.fetchEmployees();
  await agenda.loadAgenda();
  await bookingStore.fetchWalkInQueue();
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

// Walk-in handlers
async function onWalkInSave(dto: CreateWalkInDTO) {
  try {
    await bookingStore.createWalkIn(dto);
    showWalkInDialog.value = false;
    notification.success('Cliente agregado a la cola');
  } catch {
    notification.error('Error al agregar walk-in');
  }
}

async function onWalkInStartServing(entry: WalkInEntry) {
  try {
    await bookingStore.updateWalkInStatus(entry.id, 'serving');
    notification.success(`${entry.customer_name} en atención`);
  } catch {
    notification.error('Error al iniciar atención');
  }
}

async function onWalkInComplete(entry: WalkInEntry) {
  try {
    if (entry.service_id && entry.employee_id) {
      const today = new Date().toISOString().split('T')[0];
      const now = new Date();
      const startTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      await bookingStore.createBooking({
        service_id: entry.service_id,
        employee_id: entry.employee_id,
        date: today,
        start_time: startTime,
        customer_name: entry.customer_name,
        customer_phone: entry.customer_phone ?? undefined,
        source: 'walk_in',
      });
    }
    await bookingStore.updateWalkInStatus(entry.id, 'completed');
    notification.success('Walk-in completado');
    await agenda.loadAgenda();
  } catch {
    notification.error('Error al completar walk-in');
  }
}

async function onWalkInCancel(entry: WalkInEntry) {
  try {
    await bookingStore.updateWalkInStatus(entry.id, 'cancelled');
    notification.success('Walk-in cancelado');
  } catch {
    notification.error('Error al cancelar walk-in');
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
</script>
