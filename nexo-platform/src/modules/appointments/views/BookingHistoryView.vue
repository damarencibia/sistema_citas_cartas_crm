<template>
  <div>
    <PageHeader title="Historial de Citas" subtitle="Historial completo de reservas" />

    <v-card class="mb-4 pa-4">
      <v-row>
        <v-col cols="12" sm="4">
          <v-text-field
            v-model="dateFrom"
            label="Desde"
            type="date"
            density="compact"
            hide-details
          />
        </v-col>
        <v-col cols="12" sm="4">
          <v-text-field
            v-model="dateTo"
            label="Hasta"
            type="date"
            density="compact"
            hide-details
          />
        </v-col>
        <v-col cols="12" sm="4">
          <v-btn color="primary" variant="flat" @click="onSearch">
            <v-icon start>mdi-magnify</v-icon>
            Buscar
          </v-btn>
        </v-col>
      </v-row>
    </v-card>

    <v-card>
      <div v-if="bookingStore.loading" class="text-center pa-8">
        <v-progress-circular indeterminate color="primary" />
      </div>
      <v-table v-else>
        <thead>
          <tr>
            <th class="text-left">Cliente</th>
            <th class="text-left">Servicio</th>
            <th class="text-left">Fecha</th>
            <th class="text-left">Hora</th>
            <th class="text-left">Estado</th>
            <th class="text-left">Origen</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="booking in bookingStore.bookings" :key="booking.id">
            <td>{{ booking.customer_name || 'Sin nombre' }}</td>
            <td>{{ booking.service?.name || '—' }}</td>
            <td>{{ booking.date }}</td>
            <td>{{ booking.start_time?.slice(0, 5) }}</td>
            <td>
              <BookingStatusChip :status="booking.status" />
            </td>
            <td class="text-capitalize">{{ booking.source }}</td>
          </tr>
          <tr v-if="bookingStore.bookings.length === 0">
            <td colspan="6" class="text-center text-medium-emphasis py-8">
              No hay registros en el historial
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import PageHeader from '@/shared/components/PageHeader.vue';
import { useBookingStore } from '../stores/booking.store';
import BookingStatusChip from '../components/BookingStatusChip.vue';

const bookingStore = useBookingStore();

const dateFrom = ref('');
const dateTo = ref('');

onMounted(() => {
  bookingStore.fetchBookings();
});

function onSearch() {
  bookingStore.fetchBookings({
    date_from: dateFrom.value || undefined,
    date_to: dateTo.value || undefined,
  });
}
</script>
