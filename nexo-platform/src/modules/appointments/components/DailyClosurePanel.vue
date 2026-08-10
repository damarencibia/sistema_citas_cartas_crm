<template>
  <div class="daily-closure">
    <!-- Header -->
    <div class="d-flex align-center justify-space-between flex-wrap ga-2 mb-3">
      <div class="d-flex align-center ga-2">
        <v-icon color="primary">mdi-clipboard-check-outline</v-icon>
        <div>
          <div class="text-subtitle-1 font-weight-semibold">Cierre del día</div>
          <div class="text-caption text-medium-emphasis">{{ formattedDate }}</div>
        </div>
      </div>
      <div class="d-flex align-center ga-2 flex-wrap">
        <v-chip size="small" color="primary" variant="tonal">
          {{ summary.attended }}/{{ summary.total }} asistieron
        </v-chip>
        <v-btn
          color="primary"
          variant="flat"
          size="small"
          prepend-icon="mdi-check-decagram"
          :loading="saving"
          :disabled="!canClose || saving"
          :title="canClose ? 'Finalizar el cierre del día' : 'Faltan citas por atender'"
          @click="showCloseDialog = true"
        >
          Cerrar día
        </v-btn>
      </div>
    </div>

    <!-- Closed banner -->
    <v-alert
      v-if="closed"
      type="success"
      variant="tonal"
      class="mb-3"
      density="comfortable"
    >
      <div class="d-flex align-center justify-space-between flex-wrap ga-2">
        <span>
          Día cerrado — <strong>{{ summary.totalAttended }}</strong> atendidos
          ({{ summary.attended }} citas + {{ summary.extras }} extras)
        </span>
        <v-btn
          size="small"
          variant="text"
          :loading="saving"
          @click="onReopen"
        >
          Reabrir
        </v-btn>
      </div>
    </v-alert>

    <!-- Loading -->
    <div v-if="loading" class="text-center pa-6">
      <v-progress-circular indeterminate color="primary" size="28" />
    </div>

    <template v-else>
      <!-- No employee selected -->
      <div v-if="!employeeId" class="text-center pa-6">
        <v-icon size="48" color="medium-emphasis">mdi-account-search-outline</v-icon>
        <p class="text-body-2 text-medium-emphasis mt-2">
          Selecciona un empleado y una fecha para ver su cierre.
        </p>
      </div>

      <template v-else>
        <!-- Progress -->
        <div v-if="summary.total > 0" class="mb-4">
          <div class="d-flex align-center justify-space-between text-caption mb-1">
            <span class="text-medium-emphasis">Progreso de atención</span>
            <span class="font-weight-medium">{{ progressPct }}%</span>
          </div>
          <v-progress-linear
            :model-value="progressPct"
            height="8"
            rounded
            :color="progressPct === 100 ? 'success' : 'primary'"
          />
        </div>

        <!-- KPI cards -->
        <v-row class="mb-4">
          <v-col
            v-for="kpi in kpis"
            :key="kpi.label"
            cols="6"
            sm="4"
            md="2"
          >
            <v-card
              variant="tonal"
              :color="kpi.color"
              class="pa-3 text-center"
            >
              <div class="text-h6 font-weight-bold">{{ kpi.value }}</div>
              <div class="text-caption text-medium-emphasis">{{ kpi.label }}</div>
            </v-card>
          </v-col>
        </v-row>

        <!-- Bookings section -->
        <div class="mb-4">
          <div class="d-flex align-center justify-space-between mb-2 flex-wrap ga-2">
            <div class="text-caption text-medium-emphasis font-weight-medium">CITAS PROGRAMADAS</div>
            <div class="d-flex align-center ga-2">
              <v-btn
                v-if="pendingBookings.length > 0"
                size="small"
                variant="tonal"
                color="success"
                prepend-icon="mdi-check-all"
                @click="$emit('markAllAttended', pendingBookings)"
              >
                Marcar todos asistidos
              </v-btn>
              <v-chip
                v-for="f in filterOptions"
                :key="f.value"
                size="small"
                :variant="filter === f.value ? 'flat' : 'tonal'"
                :color="filter === f.value ? 'primary' : 'default'"
                @click="filter = f.value"
              >
                {{ f.label }}
                <span class="ml-1 text-caption">{{ f.count }}</span>
              </v-chip>
            </div>
          </div>

          <div v-if="filteredBookings.length === 0" class="text-center pa-4">
            <p class="text-body-2 text-medium-emphasis">Sin citas en esta vista</p>
          </div>

          <v-list
            v-else
            density="compact"
            lines="two"
            class="bg-transparent pa-0"
          >
            <v-list-item
              v-for="b in filteredBookings"
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
                <div v-if="isPending(b)" class="d-flex ga-1">
                  <v-btn
                    size="small"
                    icon="mdi-check"
                    variant="tonal"
                    color="success"
                    title="Asistió"
                    @click="$emit('markAttended', b)"
                  />
                  <v-btn
                    size="small"
                    icon="mdi-close"
                    variant="tonal"
                    color="error"
                    title="No asistió"
                    @click="$emit('markNoShow', b)"
                  />
                </div>
                <v-chip
                  v-else-if="b.status === 'completed'"
                  size="x-small"
                  color="success"
                  variant="tonal"
                >
                  Asistió
                </v-chip>
                <v-chip
                  v-else-if="b.status === 'no_show'"
                  size="x-small"
                  color="error"
                  variant="tonal"
                >
                  No asistió
                </v-chip>
              </template>
            </v-list-item>
          </v-list>
        </div>

        <!-- Extras section -->
        <div class="mb-4">
          <div class="d-flex align-center justify-space-between mb-2">
            <div class="text-caption text-medium-emphasis font-weight-medium">EXTRAS ATENDIDOS</div>
            <div class="d-flex align-center ga-1">
              <v-btn
                size="x-small"
                variant="text"
                color="primary"
                prepend-icon="mdi-layers"
                @click="showAddExtraBatch = true"
              >
                Por lote
              </v-btn>
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
          <span class="text-medium-emphasis">Pendientes:</span>
          <span class="font-weight-medium text-warning">{{ summary.pending }}</span>
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
    </template>

    <!-- Cerrar día confirm dialog -->
    <v-dialog v-model="showCloseDialog" max-width="440">
      <v-card>
        <v-card-title class="text-h6">Cerrar el día</v-card-title>
        <v-card-text>
          <p class="text-body-2 mb-3">Confirma el resumen de cierre:</p>
          <div class="d-flex justify-space-between text-body-2">
            <span class="text-medium-emphasis">Citas programadas</span>
            <span class="font-weight-medium">{{ summary.total }}</span>
          </div>
          <div class="d-flex justify-space-between text-body-2">
            <span class="text-medium-emphasis">Asistieron</span>
            <span class="font-weight-medium text-success">{{ summary.attended }}</span>
          </div>
          <div class="d-flex justify-space-between text-body-2">
            <span class="text-medium-emphasis">No asistieron</span>
            <span class="font-weight-medium text-error">{{ summary.noShows }}</span>
          </div>
          <div class="d-flex justify-space-between text-body-2">
            <span class="text-medium-emphasis">Extras</span>
            <span class="font-weight-medium text-amber">{{ summary.extras }}</span>
          </div>
          <v-divider class="my-3" />
          <div class="d-flex justify-space-between text-body-1 font-weight-bold">
            <span>Total atendidos</span>
            <span class="text-primary">{{ summary.totalAttended }}</span>
          </div>
        </v-card-text>
        <v-card-actions class="pa-4 pt-0">
          <v-spacer />
          <v-btn variant="text" @click="showCloseDialog = false">Cancelar</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :loading="saving"
            @click="confirmClose"
          >
            Confirmar cierre
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

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
    <!-- Add extra batch dialog -->
    <v-dialog v-model="showAddExtraBatch" max-width="400">
      <v-card>
        <v-card-title class="text-h6">Agregar extras por lote</v-card-title>
        <v-card-text>
          <v-select
            v-model="batchForm.service_id"
            :items="serviceOptions"
            item-title="text"
            item-value="value"
            label="Servicio"
            density="compact"
            class="mb-3"
          />
          <v-text-field
            v-model.number="batchForm.count"
            label="Número de clientes atendidos"
            type="number"
            density="compact"
            min="1"
            :rules="[batchForm.count >= 1 || 'Ingresa al menos 1']"
          />
        </v-card-text>
        <v-card-actions class="pa-4 pt-0">
          <v-spacer />
          <v-btn variant="text" @click="showAddExtraBatch = false">Cancelar</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :loading="saving"
            :disabled="!batchForm.service_id || !batchForm.count || batchForm.count < 1"
            @click="onAddExtraBatch"
          >
            Agregar {{ batchForm.count }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { dailyExtrasRepository } from '../repositories/daily-extras.repository';
import { dailyClosureRepository } from '../repositories/daily-closure.repository';
import { useEmployeeStore } from '../stores/employee.store';
import { useBookingStore } from '../stores/booking.store';
import { useAuthStore } from '@/shared/stores/auth.store';
import type { Booking, DailyExtra } from '../types/booking.types';

const props = defineProps<{
  employeeId: string | null;
  date: string;
  tenantId: string;
}>();

defineEmits<{
  markAttended: [booking: Booking];
  markNoShow: [booking: Booking];
  markAllAttended: [bookings: Booking[]];
  removeExtra: [extra: DailyExtra];
  refresh: [];
}>();

const bookingStore = useBookingStore();
const employeeStore = useEmployeeStore();
const authStore = useAuthStore();

const loading = ref(false);
const saving = ref(false);
const extras = ref<DailyExtra[]>([]);
const showAddExtra = ref(false);
const extraForm = ref({ customer_name: '', service_id: '' as string | '' });
const showAddExtraBatch = ref(false);
const batchForm = ref({ service_id: '' as string | '', count: 1 as number });
const filter = ref<'all' | 'pending' | 'attended' | 'no_show'>('all');
const showCloseDialog = ref(false);
const closed = ref(false);

const bookings = computed(() => {
  if (!props.employeeId) return [];
  return bookingStore.bookings.filter(
    (b) => b.employee_id === props.employeeId && b.date === props.date,
  );
});

const isPending = (b: Booking) =>
  b.status === 'confirmed' || b.status === 'in_progress' || b.status === 'pending_confirmation';

const summary = computed(() => {
  const total = bookings.value.length;
  const attended = bookings.value.filter((b) => b.status === 'completed').length;
  const noShows = bookings.value.filter((b) => b.status === 'no_show').length;
  return {
    total,
    attended,
    noShows,
    pending: total - attended - noShows,
    extras: extras.value.length,
    totalAttended: attended + extras.value.length,
  };
});

const pendingBookings = computed(() => bookings.value.filter(isPending));

const canClose = computed(() => summary.value.total > 0 && summary.value.pending === 0);

const progressPct = computed(() =>
  summary.value.total > 0 ? Math.round((summary.value.attended / summary.value.total) * 100) : 0,
);

const kpis = computed(() => [
  { label: 'Programadas', value: summary.value.total, color: 'default' },
  { label: 'Pendientes', value: summary.value.pending, color: 'warning' },
  { label: 'Asistieron', value: summary.value.attended, color: 'success' },
  { label: 'No asistieron', value: summary.value.noShows, color: 'error' },
  { label: 'Extras', value: summary.value.extras, color: 'amber' },
  { label: 'Total atendidos', value: summary.value.totalAttended, color: 'primary' },
]);

const filterOptions = computed(() => [
  { value: 'all' as const, label: 'Todas', count: bookings.value.length },
  { value: 'pending' as const, label: 'Pendientes', count: summary.value.pending },
  { value: 'attended' as const, label: 'Asistieron', count: summary.value.attended },
  { value: 'no_show' as const, label: 'No asistieron', count: summary.value.noShows },
]);

const filteredBookings = computed(() => {
  switch (filter.value) {
    case 'pending':
      return bookings.value.filter(isPending);
    case 'attended':
      return bookings.value.filter((b) => b.status === 'completed');
    case 'no_show':
      return bookings.value.filter((b) => b.status === 'no_show');
    default:
      return bookings.value;
  }
});

const formattedDate = computed(() => {
  if (!props.date) return '';
  return new Date(props.date + 'T12:00:00').toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
});

const serviceOptions = computed(() =>
  employeeStore.employeeServices.map((s) => ({
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

async function confirmClose() {
  if (!props.employeeId) return;
  saving.value = true;
  try {
    await dailyClosureRepository.close(props.tenantId, {
      employee_id: props.employeeId,
      date: props.date,
      closed_by: authStore.user?.id ?? null,
      total_bookings: summary.value.total,
      attended: summary.value.attended,
      no_shows: summary.value.noShows,
      extras: summary.value.extras,
      total_attended: summary.value.totalAttended,
    });
    closed.value = true;
    showCloseDialog.value = false;
  } catch {
    closed.value = false;
  } finally {
    saving.value = false;
  }
}

async function onReopen() {
  if (!props.employeeId) return;
  saving.value = true;
  try {
    await dailyClosureRepository.reopen(props.employeeId, props.date);
    closed.value = false;
  } catch {
    /* empty */
  } finally {
    saving.value = false;
  }
}

async function loadClosure() {
  if (!props.employeeId || !props.date) {
    closed.value = false;
    return;
  }
  try {
    const closure = await dailyClosureRepository.getByEmployeeAndDate(props.employeeId, props.date);
    closed.value = !!closure;
  } catch {
    closed.value = false;
  }
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

async function onAddExtraBatch() {
  if (!props.employeeId || !batchForm.value.service_id) return;
  saving.value = true;
  try {
    const count = Math.max(1, Math.floor(batchForm.value.count) || 1);
    for (let i = 1; i <= count; i++) {
      await dailyExtrasRepository.create(props.tenantId, {
        employee_id: props.employeeId,
        date: props.date,
        customer_name: `Cliente extra ${i}`,
        service_id: batchForm.value.service_id,
      });
    }
    batchForm.value = { service_id: '', count: 1 };
    showAddExtraBatch.value = false;
    await loadExtras();
  } catch {
    /* empty */
  } finally {
    saving.value = false;
  }
}

watch(() => [props.employeeId, props.date], () => {
  filter.value = 'all';
  loadClosure();
  loadExtras();
  if (props.employeeId) {
    employeeStore.fetchEmployeeServices(props.employeeId);
  }
}, { immediate: true });

defineExpose({ loadExtras });
</script>
