<template>
  <div>
    <PageHeader title="Reservas" subtitle="Todas las reservas del negocio">
      <template #actions>
        <v-btn color="primary" @click="showForm = true">
          <v-icon start>mdi-plus</v-icon>
          Nueva Reserva
        </v-btn>
      </template>
    </PageHeader>

    <v-tabs v-model="activeTab" class="mb-4">
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

    <v-tabs-window v-model="activeTab">
      <v-tabs-window-item value="all">
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
import { ref, reactive, computed, onMounted, watch } from 'vue';
import PageHeader from '@/shared/components/PageHeader.vue';
import { useNotification } from '@/shared/composables/useNotification';
import { useBookingStore } from '../stores/booking.store';
import { useEmployeeStore } from '../stores/employee.store';
import BookingCard from '../components/BookingCard.vue';
import BookingForm from '../components/BookingForm.vue';
import BookingDetailDialog from '../components/BookingDetailDialog.vue';
import BookingApprovalList from '../components/BookingApprovalList.vue';
import type { Booking, CreateBookingDTO } from '../types/booking.types';

const bookingStore = useBookingStore();
const employeeStore = useEmployeeStore();
const notification = useNotification();

const activeTab = ref('all');
const showForm = ref(false);
const showDetail = ref(false);
const selectedBooking = ref<Booking | null>(null);

const filters = reactive({
  date: null as string | null,
  employee_id: null as string | null,
  status: null as string | null,
});

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
];

onMounted(async () => {
  await employeeStore.fetchEmployees();
  await bookingStore.fetchBookings();
});

watch(filters, () => {
  bookingStore.setFilters({
    date: filters.date ?? undefined,
    employee_id: filters.employee_id,
    status: filters.status as Booking['status'] | null,
  });
  bookingStore.fetchBookings();
}, { deep: true });

function openDetail(booking: Booking) {
  selectedBooking.value = booking;
  showDetail.value = true;
}

async function onCreateBooking(data: CreateBookingDTO) {
  try {
    await bookingStore.createBooking(data);
    showForm.value = false;
    await bookingStore.fetchBookings();
    notification.success('Reserva creada');
  } catch {
    notification.error('Error al crear reserva');
  }
}

function onStatusChange(booking: Booking, status: string) {
  changeStatus(booking.id, status);
}

async function onCancelBooking(
  booking: Booking,
  reason: string,
  blockOption: 'none' | 'temporary' | 'indefinite',
  blockDays: number,
) {
  try {
    await bookingStore.updateStatus(booking.id, 'cancelled', reason || undefined, 'customer');

    if (blockOption !== 'none' && booking.customer_email) {
      const blockedUntil = new Date();
      if (blockOption === 'temporary') {
        blockedUntil.setDate(blockedUntil.getDate() + blockDays);
      } else {
        blockedUntil.setFullYear(blockedUntil.getFullYear() + 10);
      }
      const tenantId = booking.tenant_id;
      const { bookingRepository } = await import('../repositories/booking.repository');
      const noShowCount = await bookingStore.countRecentNoShows(booking.customer_email);
      await bookingRepository.createClientBlock(
        tenantId,
        booking.customer_email,
        blockedUntil.toISOString().split('T')[0],
        reason || 'Bloqueado por cancelación de cita',
        noShowCount,
      );
    }

    notification.success('Cita cancelada');
    showDetail.value = false;
    await bookingStore.fetchBookings();
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
    await bookingStore.fetchBookings();
  } catch {
    notification.error('Error al reasignar cita');
  }
}

async function changeStatus(id: string, status: string, reason?: string) {
  try {
    await bookingStore.updateStatus(id, status as Booking['status'], reason);
    notification.success('Estado actualizado');
    showDetail.value = false;
    await bookingStore.fetchBookings();
  } catch {
    notification.error('Error al actualizar estado');
  }
}

async function onApproveBooking(booking: Booking) {
  try {
    await bookingStore.approveBooking(booking.id);
    notification.success('Reserva aprobada');
    await bookingStore.fetchBookings();
  } catch {
    notification.error('Error al aprobar reserva');
  }
}

async function onRejectBooking(booking: Booking, reason: string) {
  try {
    await bookingStore.rejectBooking(booking.id, reason || undefined);
    notification.success('Reserva rechazada');
    await bookingStore.fetchBookings();
  } catch {
    notification.error('Error al rechazar reserva');
  }
}
</script>
