<template>
  <div>
    <PageHeader title="Agenda" subtitle="Gestiona las citas del día">
      <template #actions>
        <v-btn color="primary" @click="showForm = true">
          <v-icon start>mdi-plus</v-icon>
          Nueva Cita
        </v-btn>
      </template>
    </PageHeader>

    <v-card class="pa-4 mb-4">
      <div class="d-flex align-center ga-2 mb-4">
        <v-select
          v-model="agenda.selectedEmployeeId.value"
          :items="employeeOptions"
          item-title="text"
          item-value="value"
          label="Empleado"
          density="compact"
          hide-details
          clearable
          style="max-width: 250px"
        />
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
import type { Booking, CreateBookingDTO } from '../types/booking.types';

const bookingStore = useBookingStore();
const employeeStore = useEmployeeStore();
const notification = useNotification();
const agenda = useAgenda();

const showForm = ref(false);
const showDetail = ref(false);
const selectedBooking = ref<Booking | null>(null);

const employeeOptions = computed(() =>
  employeeStore.activeEmployees.map((e) => ({
    value: e.id,
    text: `${e.first_name} ${e.last_name}`,
  })),
);

onMounted(async () => {
  await employeeStore.fetchEmployees();
  await agenda.loadAgenda();
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
</script>
