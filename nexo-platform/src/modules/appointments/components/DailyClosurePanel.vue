<template>
  <div class="daily-closure">
    <div class="d-flex align-center justify-space-between mb-3">
      <div class="text-subtitle-2">Cierre del Dia</div>
      <v-chip size="small" color="primary" variant="tonal">
        {{ summary.attended }}/{{ summary.total }} asistieron
      </v-chip>
    </div>

    <div v-if="loading" class="text-center pa-4">
      <v-progress-circular indeterminate color="primary" size="24" />
    </div>

    <template v-else>
      <!-- Bookings list -->
      <div v-if="bookings.length > 0" class="mb-4">
        <div class="text-caption text-medium-emphasis mb-2 font-weight-medium">CITAS PROGRAMADAS</div>
        <v-list density="compact" lines="two" class="bg-transparent pa-0">
          <v-list-item
            v-for="b in bookings"
            :key="b.id"
            class="px-2 mb-1 rounded"
            :class="bookingBgClass(b)"
          >
            <template #prepend>
              <v-icon
                :color="b.status === 'completed' ? 'success' : b.status === 'no_show' ? 'error' : 'grey'"
                size="20"
              >
                {{ b.status === 'completed' ? 'mdi-check-circle' : b.status === 'no_show' ? 'mdi-close-circle' : 'mdi-clock-outline' }}
              </v-icon>
            </template>
            <v-list-item-title class="text-body-2 font-weight-medium">
              {{ b.customer_name || 'Sin nombre' }}
            </v-list-item-title>
            <v-list-item-subtitle class="text-caption">
              {{ b.service?.name || 'Servicio' }} · {{ formatTime(b.start_time) }}
            </v-list-item-subtitle>
            <template #append>
              <div v-if="b.status === 'confirmed' || b.status === 'in_progress'" class="d-flex ga-1">
                <v-btn
                  size="x-small"
                  icon="mdi-check"
                  variant="text"
                  color="success"
                  title="Asistio"
                  @click="$emit('markAttended', b)"
                />
                <v-btn
                  size="x-small"
                  icon="mdi-close"
                  variant="text"
                  color="error"
                  title="No asistio"
                  @click="$emit('markNoShow', b)"
                />
              </div>
              <v-chip
                v-else-if="b.status === 'completed'"
                size="x-small"
                color="success"
                variant="tonal"
              >
                Asistio
              </v-chip>
              <v-chip
                v-else-if="b.status === 'no_show'"
                size="x-small"
                color="error"
                variant="tonal"
              >
                No asistio
              </v-chip>
            </template>
          </v-list-item>
        </v-list>
      </div>

      <div v-else class="text-center pa-3 mb-3">
        <p class="text-body-2 text-medium-emphasis">Sin citas programadas</p>
      </div>

      <!-- Extras section -->
      <div class="mb-4">
        <div class="d-flex align-center justify-space-between mb-2">
          <div class="text-caption text-medium-emphasis font-weight-medium">EXTRAS ATENDIDOS</div>
          <v-btn
            size="x-small"
            variant="text"
            color="primary"
            prepend-icon="mdi-plus"
            @click="showAddExtra = true"
          >
            Agregar
          </v-btn>
        </div>

        <div v-if="extras.length === 0" class="text-body-2 text-medium-emphasis text-center pa-2">
          Sin extras registrados
        </div>

        <v-list
          v-else
          density="compact"
          lines="one"
          class="bg-transparent pa-0"
        >
          <v-list-item
            v-for="extra in extras"
            :key="extra.id"
            class="px-2 mb-1 rounded"
          >
            <template #prepend>
              <v-icon size="20" color="amber">mdi-account-plus</v-icon>
            </template>
            <v-list-item-title class="text-body-2">
              {{ extra.customer_name }}
            </v-list-item-title>
            <v-list-item-subtitle class="text-caption">
              {{ extra.service?.name || 'Sin servicio' }}
            </v-list-item-subtitle>
            <template #append>
              <v-btn
                icon="mdi-delete-outline"
                size="x-small"
                variant="text"
                color="error"
                @click="$emit('removeExtra', extra)"
              />
            </template>
          </v-list-item>
        </v-list>
      </div>

      <!-- Summary -->
      <v-divider class="mb-3" />
      <div class="d-flex justify-space-between text-body-2">
        <span class="text-medium-emphasis">Programadas:</span>
        <span class="font-weight-medium">{{ summary.total }}</span>
      </div>
      <div class="d-flex justify-space-between text-body-2">
        <span class="text-medium-emphasis">Asistieron:</span>
        <span class="font-weight-medium text-success">{{ summary.attended }}</span>
      </div>
      <div class="d-flex justify-space-between text-body-2">
        <span class="text-medium-emphasis">No asistieron:</span>
        <span class="font-weight-medium text-error">{{ summary.noShows }}</span>
      </div>
      <div class="d-flex justify-space-between text-body-2">
        <span class="text-medium-emphasis">Extras:</span>
        <span class="font-weight-medium text-amber">{{ summary.extras }}</span>
      </div>
      <v-divider class="my-2" />
      <div class="d-flex justify-space-between text-body-1 font-weight-bold">
        <span>Total atendidos:</span>
        <span class="text-primary">{{ summary.totalAttended }}</span>
      </div>
    </template>

    <!-- Add extra dialog -->
    <v-dialog v-model="showAddExtra" max-width="400">
      <v-card>
        <v-card-title class="text-h6">Agregar Extra</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="extraForm.customer_name"
            label="Nombre del cliente"
            density="compact"
            autofocus
            class="mb-3"
          />
          <v-select
            v-model="extraForm.service_id"
            :items="serviceOptions"
            item-title="text"
            item-value="value"
            label="Servicio (opcional)"
            density="compact"
            clearable
          />
        </v-card-text>
        <v-card-actions class="pa-4 pt-0">
          <v-spacer />
          <v-btn variant="text" @click="showAddExtra = false">Cancelar</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :disabled="!extraForm.customer_name.trim()"
            @click="onAddExtra"
          >
            Agregar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { dailyExtrasRepository } from '../repositories/daily-extras.repository';
import { useServiceStore } from '../stores/service.store';
import { useBookingStore } from '../stores/booking.store';
import type { Booking, DailyExtra } from '../types/booking.types';

const props = defineProps<{
  employeeId: string | null;
  date: string;
  tenantId: string;
}>();

const emit = defineEmits<{
  markAttended: [booking: Booking];
  markNoShow: [booking: Booking];
  removeExtra: [extra: DailyExtra];
  refresh: [];
}>();

const bookingStore = useBookingStore();
const serviceStore = useServiceStore();

const loading = ref(false);
const extras = ref<DailyExtra[]>([]);
const showAddExtra = ref(false);
const extraForm = ref({ customer_name: '', service_id: '' as string | '' });

const bookings = computed(() => {
  if (!props.employeeId) return [];
  return bookingStore.bookings.filter(
    (b) => b.employee_id === props.employeeId && b.date === props.date,
  );
});

const summary = computed(() => {
  const total = bookings.value.length;
  const attended = bookings.value.filter((b) => b.status === 'completed').length;
  const noShows = bookings.value.filter((b) => b.status === 'no_show').length;
  return {
    total,
    attended,
    noShows,
    extras: extras.value.length,
    totalAttended: attended + extras.value.length,
  };
});

const serviceOptions = computed(() =>
  serviceStore.services.map((s) => ({
    value: s.id,
    text: `${s.name} (${s.duration_minutes}m)`,
  })),
);

function formatTime(time: string): string {
  return time?.slice(0, 5) || '';
}

function bookingBgClass(b: Booking): string {
  if (b.status === 'completed') return 'bg-success-lighten-5';
  if (b.status === 'no_show') return 'bg-error-lighten-5';
  return '';
}

async function loadExtras() {
  if (!props.employeeId || !props.date) return;
  loading.value = true;
  try {
    extras.value = await dailyExtrasRepository.getByEmployeeAndDate(props.employeeId, props.date);
  } catch {
    extras.value = [];
  } finally {
    loading.value = false;
  }
}

async function onAddExtra() {
  if (!extraForm.value.customer_name.trim() || !props.employeeId) return;
  try {
    await dailyExtrasRepository.create(props.tenantId, {
      employee_id: props.employeeId,
      date: props.date,
      customer_name: extraForm.value.customer_name.trim(),
      service_id: extraForm.value.service_id || undefined,
    });
    extraForm.value = { customer_name: '', service_id: '' };
    showAddExtra.value = false;
    await loadExtras();
  } catch {
    /* empty */
  }
}

watch(() => [props.employeeId, props.date], loadExtras, { immediate: true });

defineExpose({ loadExtras });
</script>
