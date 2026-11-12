<template>
  <div class="daily-closure d-flex flex-column h-100">
    <!-- Closed banner: strip editorial del family sello -->
    <div v-if="closed && activeTab !== 'summary'" class="closure-closed-strip align-self-center mt-3">
      <v-icon size="13" aria-hidden="true">mdi-check-decagram</v-icon>
      <span>Día cerrado — {{ summary.totalAttended }} atendidos</span>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center pa-6 flex-grow-1">
      <v-progress-circular indeterminate color="primary" size="28" />
    </div>

    <template v-else>
      <!-- No employee selected -->
      <div v-if="!employeeId" class="text-center pa-6 flex-grow-1">
        <v-icon size="48" color="medium-emphasis">mdi-account-search-outline</v-icon>
        <p class="text-body-2 text-medium-emphasis mt-2">
          Selecciona un empleado para ver su cierre.
        </p>
      </div>

      <template v-else>
        <!-- Tabs -->
        <v-tabs
          v-model="activeTab"
          density="compact"
          color="primary"
          grow
          class="flex-shrink-0 px-2 daily-closure__tabs"
        >
          <v-tab value="scheduled">Programadas</v-tab>
          <v-tab value="extras" :disabled="isFutureDate">Extras</v-tab>
          <v-tab value="summary" :disabled="isFutureDate">Resumen</v-tab>
        </v-tabs>

        <v-tabs-window
          v-model="activeTab"
          class="daily-closure__window flex-grow-1"
        >
          <!-- Programadas -->
          <v-tabs-window-item value="scheduled">
            <div class="px-4 pb-4 pt-2">
              <div v-if="summary.total > 0" class="closure-attendance">
                <div class="closure-attendance__row">
                  <span class="closure-section-label">Atención</span>
                  <span class="closure-attendance__value">
                    {{ summary.attended }}/{{ summary.total }} · {{ progressPct }}%
                  </span>
                </div>
                <div
                  class="closure-attendance__track"
                  :class="{ 'closure-attendance__track--done': progressPct === 100 }"
                >
                  <div
                    class="closure-attendance__fill"
                    :style="{ width: `${progressPct}%` }"
                  />
                </div>
              </div>

              <div class="d-flex align-center justify-space-between mb-2 flex-wrap ga-2">
                <div class="closure-section-label">Citas programadas</div>
                <v-btn
                  v-if="pendingBookings.length > 0"
                  size="small"
                  variant="tonal"
                  color="success"
                  prepend-icon="mdi-check-all"
                  :disabled="closed || isFutureDate"
                  @click="$emit('markAllAttended', pendingBookings)"
                >
                  Marcar todos asistidos
                </v-btn>
              </div>

              <div class="closure-filters mb-3" role="group" aria-label="Filtrar citas">
                <button
                  v-for="f in filterOptions"
                  :key="f.value"
                  type="button"
                  class="closure-filter"
                  :class="{ 'closure-filter--active': filter === f.value }"
                  :aria-pressed="filter === f.value"
                  @click="filter = f.value"
                >
                  {{ f.label }}
                  <span class="closure-filter__count">{{ f.count }}</span>
                </button>
              </div>

              <div v-if="filteredBookings.length === 0" class="closure-empty">
                <v-icon size="22" aria-hidden="true">mdi-calendar-blank-outline</v-icon>
                <p>{{ emptyBookingsCopy }}</p>
              </div>

              <v-list
                v-else
                density="compact"
                lines="two"
                class="bg-transparent pa-0 closure-list"
              >
                <v-list-item
                  v-for="b in filteredBookings"
                  :key="b.id"
                  class="px-2"
                  :class="{ 'closure-list__row--flash': flashedId === b.id }"
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
                    <span class="closure-list__time">{{ formatTime(b.start_time) }}</span>
                    · {{ b.service?.name || 'Servicio' }}
                  </v-list-item-subtitle>
                  <template #append>
                    <div v-if="canMark(b)" class="d-flex ga-1">
                      <v-btn
                        size="small"
                        icon="mdi-check"
                        variant="tonal"
                        color="success"
                        title="Asistió"
                        :disabled="closed || isFutureDate"
                        @click="markAttended(b)"
                      />
                      <v-btn
                        size="small"
                        icon="mdi-close"
                        variant="tonal"
                        color="error"
                        title="No asistió"
                        :disabled="closed || isFutureDate"
                        @click="markNoShow(b)"
                      />
                    </div>
                    <v-menu
                      v-else-if="b.status === 'completed' || b.status === 'no_show'"
                      location="bottom end"
                    >
                      <template #activator="{ props: menuProps }">
                        <v-chip
                          v-bind="menuProps"
                          size="x-small"
                          :color="b.status === 'completed' ? 'success' : 'error'"
                          variant="tonal"
                          :disabled="closed || isFutureDate"
                          class="cursor-pointer"
                        >
                          {{ b.status === 'completed' ? 'Asistió' : 'No asistió' }}
                          <v-icon end size="14">mdi-chevron-down</v-icon>
                        </v-chip>
                      </template>
                      <v-list density="compact">
                        <v-list-item
                          v-if="b.status === 'completed'"
                          @click="markNoShow(b)"
                        >
                          <v-list-item-title class="text-caption">
                            Marcar no asistió
                          </v-list-item-title>
                        </v-list-item>
                        <v-list-item v-else @click="markAttended(b)">
                          <v-list-item-title class="text-caption">
                            Marcar asistió
                          </v-list-item-title>
                        </v-list-item>
                        <v-list-item @click="$emit('cancelSelection', b)">
                          <v-list-item-title class="text-caption">
                            Cancelar selección
                          </v-list-item-title>
                        </v-list-item>
                      </v-list>
                    </v-menu>
                  </template>
                </v-list-item>
              </v-list>
            </div>
          </v-tabs-window-item>

          <!-- Extras -->
          <v-tabs-window-item value="extras">
            <div class="px-4 pb-4 pt-2">
              <div
                class="closure-extra-head d-flex align-center justify-space-between mb-2 flex-wrap ga-2"
              >
                <div class="closure-section-label">Extras · {{ extras.length }}</div>
                <div class="closure-extra-actions">
                  <v-btn
                    size="small"
                    :variant="isNarrow ? 'outlined' : 'text'"
                    color="primary"
                    prepend-icon="mdi-layers"
                    :disabled="closed || isFutureDate"
                    @click="showAddExtraBatch = true"
                  >
                    Por lote
                  </v-btn>
                  <v-btn
                    size="small"
                    variant="tonal"
                    color="primary"
                    prepend-icon="mdi-plus"
                    :disabled="closed || isFutureDate"
                    @click="showAddExtra = true"
                  >
                    Agregar
                  </v-btn>
                </div>
              </div>

              <div v-if="extras.length === 0" class="closure-empty">
                <v-icon size="22" aria-hidden="true">mdi-account-plus-outline</v-icon>
                <p>Sin extras. Usa «Agregar» si atendiste a alguien sin reserva.</p>
              </div>

              <v-list
                v-else
                density="compact"
                lines="two"
                class="bg-transparent pa-0 closure-list"
              >
                <v-list-item
                  v-for="extra in extras"
                  :key="extra.id"
                  class="px-2"
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
                    <span v-if="extra.service?.price" class="closure-list__amount">
                      {{ formatCurrency(extra.service.price) }}
                    </span>
                    <v-btn
                      icon="mdi-delete-outline"
                      size="x-small"
                      variant="text"
                      color="error"
                      :disabled="closed || isFutureDate"
                      @click="$emit('removeExtra', extra)"
                    />
                  </template>
                </v-list-item>
              </v-list>
            </div>
          </v-tabs-window-item>

          <!-- Resumen económico-contable: dos columnas en desktop -->
          <v-tabs-window-item value="summary">
            <div class="closure-summary px-4 pb-3 pt-2">
              <!-- Columna izquierda: titular, conteos, ingresos -->
              <div class="closure-summary__col">
                <div class="closure-headline">
                  <span class="closure-section-label">Total del día</span>
                  <span class="closure-headline__amount">{{ formatCurrency(totalRevenue) }}</span>
                  <span class="closure-headline__meta">
                    {{ summary.totalAttended }} atendidos · {{ summary.total }} programadas<template v-if="summary.extras > 0"> · {{ summary.extras }} extras</template>
                  </span>
                </div>

                <div class="closure-cut" />

                <div class="closure-section-label mb-2">Conteos del día</div>
                <div class="closure-stats">
                  <div v-for="kpi in kpis" :key="kpi.label" class="closure-stat">
                    <span class="closure-stat__value" :class="kpi.class">{{ kpi.value }}</span>
                    <span class="closure-stat__label">{{ kpi.label }}</span>
                  </div>
                </div>

                <div class="closure-cut" />

                <div class="closure-section-label mb-1">Resumen económico</div>
                <div class="closure-rows">
                  <div class="closure-row">
                    <span class="closure-row__label">Ingresos programadas</span>
                    <span class="closure-row__value text-success">{{ formatCurrency(revenueScheduled) }}</span>
                  </div>
                  <div class="closure-row">
                    <span class="closure-row__label">Ingresos extras</span>
                    <span class="closure-row__value text-amber">{{ formatCurrency(revenueExtras) }}</span>
                  </div>
                </div>
              </div>

              <!-- Columna derecha: servicios realizados -->
              <div class="closure-summary__col closure-summary__col--services">
                <div class="closure-section-label mb-1">Servicios realizados</div>
                <div v-if="serviceBreakdown.length === 0" class="closure-empty">
                  <v-icon size="22" aria-hidden="true">mdi-scissors-cutting</v-icon>
                  <p>Sin servicios registrados — marca asistencias para verlos aquí.</p>
                </div>
                <div v-else class="closure-rows">
                  <div v-for="row in serviceBreakdown" :key="row.name" class="closure-row">
                    <span class="closure-row__label">
                      {{ row.name }}
                      <span class="closure-row__count">{{ row.count }} × {{ formatCurrency(row.unitPrice) }}</span>
                    </span>
                    <span class="closure-row__value">{{ formatCurrency(row.amount) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </v-tabs-window-item>
        </v-tabs-window>

        <!-- Sticky footer: estado + CTA en dos tiempos (confirmación inline) -->
        <div class="pa-3 flex-shrink-0 daily-closure__footer">
          <div v-if="isFutureDate && !closed" class="closure-future-strip">
            <v-icon size="14" aria-hidden="true">mdi-information-outline</v-icon>
            <span>El cierre aplica solo a hoy o días anteriores.</span>
          </div>

          <!-- En estado de confirmación la footline se omite: los mismos datos van en el
               texto de la confirmación, y así el footer queda compacto y siempre visible -->
          <div v-if="!closed && !isFutureDate && !confirmingClose" class="closure-footline">
            <span v-if="summary.pending > 0">
              <strong>{{ summary.totalAttended }}</strong> atendidos ·
              <strong>{{ summary.pending }}</strong> por marcar
            </span>
            <span v-else>
              <strong>{{ summary.totalAttended }}</strong> atendidos · listo para cerrar
            </span>
          </div>

          <!-- Día cerrado: estado sellado + reapertura con confirmación inline -->
          <template v-if="closed">
            <div v-if="!confirmingReopen" class="closure-sealed">
              <div class="closure-sealed__info">
                <span class="closure-section-label">Cierre registrado</span>
                <span class="closure-sealed__meta">
                  {{ summary.totalAttended }} atendidos · {{ formatDate(date, 'd MMM') }}
                </span>
              </div>
              <v-btn
                variant="text"
                size="small"
                prepend-icon="mdi-lock-open-variant-outline"
                class="closure-sealed__reopen"
                :disabled="saving"
                title="Reabrir el día para volver a editar las marcas"
                @click="confirmingReopen = true"
              >
                Reabrir
              </v-btn>
            </div>
            <div v-else class="closure-confirm">
              <span class="closure-confirm__text">
                Reabrir permitirá editar las marcas del día.
              </span>
              <div class="closure-confirm__actions">
                <v-btn
                  variant="text"
                  size="small"
                  :disabled="saving"
                  @click="confirmingReopen = false"
                >
                  Cancelar
                </v-btn>
                <v-btn
                  color="warning"
                  variant="tonal"
                  size="small"
                  rounded="md"
                  :loading="saving"
                  :disabled="saving"
                  @click="onReopen"
                >
                  Reabrir
                </v-btn>
              </div>
            </div>
          </template>

          <!-- Confirmación inline del cierre: el sólido se reserva para este paso -->
          <div v-else-if="confirmingClose" class="closure-confirm">
            <span class="closure-confirm__text">
              {{ summary.total }} programadas · {{ summary.totalAttended }} atendidos ·
              {{ formatCurrency(totalRevenue) }}
            </span>
            <div class="closure-confirm__actions">
              <v-btn
                variant="text"
                size="small"
                :disabled="saving"
                @click="confirmingClose = false"
              >
                Cancelar
              </v-btn>
              <v-btn
                color="success"
                variant="flat"
                size="small"
                rounded="md"
                :loading="saving"
                :disabled="saving"
                @click="confirmClose"
              >
                Confirmar cierre
              </v-btn>
            </div>
          </div>

          <v-btn
            v-else-if="!canClose"
            block
            color="warning"
            variant="tonal"
            size="large"
            rounded="md"
            prepend-icon="mdi-clipboard-clock-outline"
            :disabled="isFutureDate || saving"
            title="Ir a las citas que faltan por marcar"
            @click="reviewPending"
          >
            Revisar pendientes · {{ summary.pending }}
          </v-btn>
          <v-btn
            v-else
            block
            color="success"
            variant="tonal"
            size="large"
            rounded="md"
            prepend-icon="mdi-check-decagram"
            class="closure-cta closure-cta--ready"
            :loading="saving"
            :disabled="saving || isFutureDate"
            title="Preparar el cierre del día"
            @click="confirmingClose = true"
          >
            Cerrar día
          </v-btn>
        </div>
      </template>
    </template>

    <!-- Add extra dialog -->
    <v-dialog v-model="showAddExtra" max-width="440">
      <v-card rounded="md" class="closure-dialog-card">
        <v-card-title class="closure-dialog-title">
          <span class="closure-dialog-title__text">Agregar extra</span>
          <span class="closure-dialog-title__sub">Se sumará al cierre como atención extra.</span>
        </v-card-title>
        <v-card-text class="closure-form">
          <div class="closure-field">
            <span class="closure-field__label" aria-hidden="true">Nombre del cliente</span>
            <v-text-field
              id="closure-extra-name"
              v-model="extraForm.customer_name"
              label="Nombre del cliente"
              placeholder="Ej. Ana Ruiz"
              variant="underlined"
              density="default"
              hide-details
              autofocus
              class="closure-input"
              @keydown.enter="onAddExtra"
            />
          </div>
          <div class="closure-field">
            <span class="closure-field__label" aria-hidden="true">Servicio (opcional)</span>
            <v-select
              id="closure-extra-service"
              v-model="extraForm.service_id"
              :items="serviceOptions"
              item-title="text"
              item-value="value"
              label="Servicio (opcional)"
              placeholder="Sin servicio"
              variant="underlined"
              density="default"
              hide-details
              clearable
              :menu-props="{ contentClass: 'closure-select-menu' }"
              class="closure-input"
            />
          </div>
        </v-card-text>
        <v-card-actions class="closure-dialog-actions">
          <v-spacer />
          <v-btn variant="text" class="closure-dialog-btn" @click="showAddExtra = false">
            Cancelar
          </v-btn>
          <v-btn
            color="primary"
            variant="flat"
            class="closure-dialog-btn"
            :disabled="!extraForm.customer_name.trim()"
            @click="onAddExtra"
          >
            Agregar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <!-- Add extra batch dialog -->
    <v-dialog v-model="showAddExtraBatch" max-width="440">
      <v-card rounded="md" class="closure-dialog-card">
        <v-card-title class="closure-dialog-title">
          <span class="closure-dialog-title__text">Agregar extras por lote</span>
          <span class="closure-dialog-title__sub">
            Se crearán varios registros de cliente extra con el mismo servicio.
          </span>
        </v-card-title>
        <v-card-text class="closure-form">
          <div class="closure-field">
            <span class="closure-field__label" aria-hidden="true">Servicio</span>
            <v-select
              id="closure-batch-service"
              v-model="batchForm.service_id"
              :items="serviceOptions"
              item-title="text"
              item-value="value"
              label="Servicio"
              placeholder="Elige un servicio"
              variant="underlined"
              density="default"
              hide-details
              :menu-props="{ contentClass: 'closure-select-menu' }"
              class="closure-input"
            />
          </div>

          <div class="closure-field">
            <span class="closure-field__label" aria-hidden="true">Cantidad de clientes</span>
            <div class="closure-stepper">
              <v-btn
                icon="mdi-minus"
                variant="outlined"
                class="closure-stepper__btn"
                aria-label="Quitar un cliente"
                :disabled="batchForm.count <= 1"
                @click="stepCount(-1)"
              />
              <input
                v-model.number="batchForm.count"
                class="closure-stepper__value"
                type="number"
                inputmode="numeric"
                min="1"
                aria-label="Número de clientes atendidos"
                @blur="normalizeCount"
              >
              <v-btn
                icon="mdi-plus"
                variant="outlined"
                class="closure-stepper__btn"
                aria-label="Agregar un cliente"
                @click="stepCount(1)"
              />
            </div>
            <span v-if="countError" class="closure-field__error">{{ countError }}</span>
          </div>

          <div v-if="batchService" class="closure-batch-total">
            <span class="closure-batch-total__detail">
              {{ batchForm.count }} × {{ batchService.name }}
            </span>
            <span class="closure-batch-total__amount">{{ formatCurrency(batchTotal) }}</span>
          </div>
        </v-card-text>
        <v-card-actions class="closure-dialog-actions">
          <v-spacer />
          <v-btn variant="text" class="closure-dialog-btn" @click="showAddExtraBatch = false">
            Cancelar
          </v-btn>
          <v-btn
            color="primary"
            variant="flat"
            class="closure-dialog-btn"
            :loading="saving"
            :disabled="!batchForm.service_id || !!countError"
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
import { ref, computed, watch, onUnmounted } from 'vue';
import { useDisplay } from 'vuetify';
import { dailyExtrasRepository } from '../repositories/daily-extras.repository';
import { dailyClosureRepository } from '../repositories/daily-closure.repository';
import { useEmployeeStore } from '../stores/employee.store';
import { useBookingStore } from '../stores/booking.store';
import { useAuthStore } from '@/shared/stores/auth.store';
import { formatCurrency, formatDate } from '@/shared/utils/format';
import type { Booking, DailyExtra } from '../types/booking.types';

const props = defineProps<{
  employeeId: string | null;
  date: string;
  tenantId: string;
  visible?: boolean;
}>();

const emit = defineEmits<{
  markAttended: [booking: Booking];
  markNoShow: [booking: Booking];
  cancelSelection: [booking: Booking];
  markAllAttended: [bookings: Booking[]];
  removeExtra: [extra: DailyExtra];
  refresh: [];
  closureChanged: [closed: boolean];
  closeDialog: [];
}>();

const bookingStore = useBookingStore();
const employeeStore = useEmployeeStore();
const authStore = useAuthStore();

/** Móvil (≤699px): acciones de Extras con borde definido, a ancho completo */
const { width } = useDisplay();
const isNarrow = computed(() => width.value < 700);

const loading = ref(false);
const saving = ref(false);
const extras = ref<DailyExtra[]>([]);
const showAddExtra = ref(false);
const extraForm = ref({ customer_name: '', service_id: '' as string | '' });
const showAddExtraBatch = ref(false);
const batchForm = ref({ service_id: '' as string | '', count: 1 as number });
const filter = ref<'all' | 'pending' | 'attended' | 'no_show'>('all');
const closed = ref(false);
/** Confirmaciones inline del footer: sin micro-diálogo adicional */
const confirmingClose = ref(false);
const confirmingReopen = ref(false);
const activeTab = ref<'scheduled' | 'extras' | 'summary'>('scheduled');

const bookings = computed(() => {
  if (!props.employeeId) return [];
  return bookingStore.bookings.filter(
    (b) => b.employee_id === props.employeeId && b.date === props.date,
  );
});

const isPending = (b: Booking) => b.status === 'confirmed' || b.status === 'in_progress';

const canMark = (b: Booking) => b.status === 'confirmed' || b.status === 'in_progress';

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

const canClose = computed(() => summary.value.pending === 0);

const isFutureDate = computed(() => props.date > new Date().toISOString().slice(0, 10));

const progressPct = computed(() =>
  summary.value.total > 0 ? Math.round((summary.value.attended / summary.value.total) * 100) : 0,
);

/** Micro-flash de fila al marcar: confirma la acción sin depender de un toast */
const flashedId = ref<string | null>(null);
let flashTimer: number | undefined;

function flashRow(id: string) {
  flashedId.value = id;
  window.clearTimeout(flashTimer);
  flashTimer = window.setTimeout(() => {
    flashedId.value = null;
  }, 450);
}

onUnmounted(() => window.clearTimeout(flashTimer));

function markAttended(booking: Booking) {
  flashRow(booking.id);
  emit('markAttended', booking);
}

function markNoShow(booking: Booking) {
  flashRow(booking.id);
  emit('markNoShow', booking);
}

/** El footer no bloquea: lleva al usuario a lo que falta por marcar */
function reviewPending() {
  activeTab.value = 'scheduled';
  filter.value = 'pending';
}

/** Estados vacíos con instrucción (qué hacer), no solo descripción */
const emptyBookingsCopy = computed(() => {
  switch (filter.value) {
    case 'pending':
      return 'No quedan citas pendientes — todo marcado.';
    case 'attended':
      return 'Aún no hay asistencias marcadas.';
    case 'no_show':
      return 'Nadie faltó en esta vista.';
    default:
      return 'Sin citas programadas para este día.';
  }
});

const kpis = computed(() => [
  { label: 'Programadas', value: summary.value.total, class: '' },
  { label: 'Pendientes', value: summary.value.pending, class: 'text-warning' },
  { label: 'Asistieron', value: summary.value.attended, class: 'text-success' },
  { label: 'No asistieron', value: summary.value.noShows, class: 'text-error' },
  { label: 'Extras', value: summary.value.extras, class: 'text-amber' },
  { label: 'Total atendidos', value: summary.value.totalAttended, class: '' },
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

const revenueScheduled = computed(() =>
  bookings.value
    .filter((b) => b.status === 'completed')
    .reduce((sum, b) => sum + (b.service?.price ?? 0), 0),
);

const revenueExtras = computed(() =>
  extras.value.reduce((sum, e) => sum + (e.service?.price ?? 0), 0),
);

const totalRevenue = computed(() => revenueScheduled.value + revenueExtras.value);

const serviceBreakdown = computed(() => {
  const map = new Map<string, { name: string; count: number; unitPrice: number; amount: number }>();
  for (const b of bookings.value) {
    if (b.status !== 'completed') continue;
    const name = b.service?.name || 'Servicio';
    const price = b.service?.price ?? 0;
    const row = map.get(name) ?? { name, count: 0, unitPrice: price, amount: 0 };
    row.count += 1;
    row.amount += price;
    map.set(name, row);
  }
  for (const e of extras.value) {
    const name = e.service?.name || 'Extra';
    const price = e.service?.price ?? 0;
    const row = map.get(name) ?? { name, count: 0, unitPrice: price, amount: 0 };
    row.count += 1;
    row.amount += price;
    map.set(name, row);
  }
  return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
});

const serviceOptions = computed(() =>
  employeeStore.employeeServices.map((s) => ({
    value: s.id,
    text: `${s.name} (${s.duration_minutes}m)`,
  })),
);

/** Contexto del lote: servicio elegido, total estimado y validación del stepper */
const batchService = computed(() =>
  employeeStore.employeeServices.find((s) => s.id === batchForm.value.service_id),
);

const batchTotal = computed(
  () => (batchService.value?.price ?? 0) * Math.max(1, Math.floor(batchForm.value.count) || 1),
);

const countError = computed(() => {
  const n = Number(batchForm.value.count);
  return Number.isFinite(n) && Math.floor(n) >= 1 ? '' : 'Ingresa al menos 1';
});

function stepCount(delta: number) {
  const current = Math.floor(Number(batchForm.value.count)) || 1;
  batchForm.value.count = Math.max(1, current + delta);
}

function normalizeCount() {
  const next = Math.floor(Number(batchForm.value.count));
  batchForm.value.count = Number.isFinite(next) && next >= 1 ? next : 1;
}

function formatTime(time: string): string {
  return time?.slice(0, 5) || '';
}

async function confirmClose() {
  if (!props.employeeId || isFutureDate.value) return;
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
    confirmingClose.value = false;
    activeTab.value = 'summary';
    emit('closureChanged', true);
    emit('closeDialog');
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
    confirmingReopen.value = false;
    activeTab.value = 'scheduled';
    emit('closureChanged', false);
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

async function resetForDate() {
  filter.value = 'all';
  confirmingClose.value = false;
  confirmingReopen.value = false;
  await loadClosure();
  loadExtras();
  activeTab.value = closed.value ? 'summary' : 'scheduled';
  if (props.employeeId) {
    employeeStore.fetchEmployeeServices(props.employeeId);
  }
}

watch(() => [props.employeeId, props.date], resetForDate, { immediate: true });

watch(
  () => props.visible,
  (visible) => {
    if (visible) resetForDate();
  },
);

defineExpose({ loadExtras });
</script>

<style scoped>
.daily-closure {
  --closure-hairline: rgb(var(--v-theme-on-surface), 0.12);
}

.daily-closure__tabs {
  flex-grow: 0;
}

.daily-closure__window {
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
}

/* Scroll funcional sin barras nativas visibles (móvil y desktop) */
.daily-closure__window,
.closure-filters {
  scrollbar-width: none;
}

.daily-closure__window::-webkit-scrollbar,
.closure-filters::-webkit-scrollbar {
  display: none;
}

/* Micro-labels de sección: la gramática 10px/0.14em del calendario */
.closure-section-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-on-surface), 0.55);
}

/* Strip de día cerrado: cápsula del family sello */
.closure-closed-strip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border: 1px solid rgb(var(--v-theme-success), 0.35);
  border-radius: 4px;
  background: rgb(var(--v-theme-success), 0.08);
  color: rgb(var(--v-theme-success));
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

/* Tabla editorial: filas con hairline y cifras tabulares */
.closure-rows {
  display: flex;
  flex-direction: column;
}

.closure-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 32px;
  border-bottom: 1px solid var(--closure-hairline);
  font-size: 13px;
}

.closure-row__label {
  min-width: 0;
  color: rgb(var(--v-theme-on-surface), 0.65);
}

.closure-row__count {
  font-size: 11px;
  color: rgb(var(--v-theme-on-surface), 0.45);
}

.closure-row__value {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

/* Titular del recibo: la única cifra enfatizada del cierre */
/* Resumen: una columna en móvil, dos en desktop (el modal mide 920px) */
.closure-summary {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
}

@media (min-width: 700px) {
  .closure-summary {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }

  .closure-summary__col:first-child {
    padding-right: 28px;
  }

  .closure-summary__col--services {
    padding-left: 28px;
    border-left: 1px solid var(--closure-hairline);
  }
}

/* Conteos como mini-stats 3×2: cifra y etiqueta juntas */
.closure-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  border-top: 1px solid var(--closure-hairline);
}

.closure-stat {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 8px 10px;
  border-bottom: 1px solid var(--closure-hairline);
}

.closure-stat:not(:nth-child(3n)) {
  border-right: 1px solid var(--closure-hairline);
}

.closure-stat:nth-child(3n + 1) {
  padding-left: 0;
}

.closure-stat__value {
  font-size: 17px;
  font-weight: 700;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}

.closure-stat__label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-on-surface), 0.5);
}

.closure-headline {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 2px 0 4px;
}

.closure-headline__amount {
  font-size: 24px;
  line-height: 1.1;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: rgb(var(--v-theme-success));
}

.closure-headline__meta {
  font-size: 11px;
  letter-spacing: 0.02em;
  color: rgb(var(--v-theme-on-surface), 0.6);
}

/* Troquelado: regla discontinua con muescas en los extremos (ticket) */
.closure-cut {
  position: relative;
  margin: 12px -4px 10px;
  border-top: 1px dashed rgb(var(--v-theme-on-surface), 0.22);
}

.closure-cut::before,
.closure-cut::after {
  content: '';
  position: absolute;
  top: -5px;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: rgb(var(--v-theme-surface));
  border: 1px solid var(--closure-hairline);
}

.closure-cut::before {
  left: -5px;
}

.closure-cut::after {
  right: -5px;
}

/* Filas tipo recibo: dot leaders eliminados — la cifra debe quedar cerca de su dato */

/* Estado de completitud sobre el CTA */
.closure-footline {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 8px;
  font-size: 11px;
  letter-spacing: 0.02em;
  color: rgb(var(--v-theme-on-surface), 0.6);
}

.closure-footline strong {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: rgb(var(--v-theme-on-surface), 0.85);
}

/* Un solo latido cuando el día queda listo para cerrar */
@keyframes closure-cta-beat {
  0% {
    transform: scale(1);
  }
  35% {
    transform: scale(1.015);
  }
  100% {
    transform: scale(1);
  }
}

.closure-cta--ready {
  animation: closure-cta-beat 500ms ease-out 1;
}

/* CTA de cierre: cápsula tonal — el sólido se reserva para "Confirmar cierre" */
.closure-cta.v-btn {
  height: 52px;
  border: 1px solid rgb(var(--v-theme-success), 0.35);
  background: rgb(var(--v-theme-success), 0.1);
}

@media (pointer: fine) {
  .closure-cta.v-btn:hover {
    background: rgb(var(--v-theme-success), 0.16);
  }
}

/* Día futuro: strip hairline de una línea en lugar de una alerta tonal */
.closure-future-strip {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  padding: 6px 10px;
  border: 1px solid var(--closure-hairline);
  border-radius: 4px;
  font-size: 11px;
  line-height: 1.35;
  color: rgb(var(--v-theme-on-surface), 0.6);
}

/* Cierre registrado: se lee como sello, no como botón */
.closure-sealed {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.closure-sealed__info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.closure-sealed__meta {
  font-size: 11px;
  letter-spacing: 0.02em;
  color: rgb(var(--v-theme-on-surface), 0.6);
}

.closure-sealed__reopen {
  flex-shrink: 0;
  color: rgb(var(--v-theme-on-surface), 0.72);
}

/* Confirmación inline (cierre y reapertura), sin micro-diálogo */
.closure-confirm {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 2px;
}

.closure-confirm__text {
  font-size: 11px;
  line-height: 1.4;
  letter-spacing: 0.02em;
  font-variant-numeric: tabular-nums;
  color: rgb(var(--v-theme-on-surface), 0.65);
}

.closure-confirm__actions {
  display: flex;
  justify-content: flex-end;
  gap: 4px;
}

/* Estados vacíos con instrucción */
.closure-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 20px 8px;
  text-align: center;
  color: rgb(var(--v-theme-on-surface), 0.5);
}

.closure-empty p {
  margin: 0;
  font-size: 12px;
  max-width: 34ch;
}

/* Listas editoriales: hairline entre filas, sin fondos tonales */
.closure-list :deep(.v-list-item) {
  border-bottom: 1px solid var(--closure-hairline);
  border-radius: 0;
  transition: background-color 400ms ease;
}

.closure-list :deep(.v-list-item:last-child) {
  border-bottom: none;
}

/* Micro-flash al marcar: la fila confirma la acción, luego se desvanece */
.closure-list :deep(.closure-list__row--flash) {
  background-color: rgb(var(--v-theme-success), 0.14);
  transition: background-color 0.1s ease;
}

/* Targets táctiles reales en puntero grueso (≥44px) */
@media (pointer: coarse) {
  .daily-closure :deep(.v-btn) {
    min-height: 44px;
  }

  .daily-closure :deep(.v-btn--icon) {
    width: 44px;
    min-width: 44px;
    height: 44px;
  }

  .closure-filter {
    align-items: center;
    min-height: 44px;
  }

  /* Filtros más juntos para evitar overflow horizontal en pantallas angostas */
  .closure-filters {
    gap: 12px;
  }
}

/* Extras en móvil: layout por viewport (no solo por tipo de puntero) */
@media (max-width: 699px) {
  .closure-extra-head {
    flex-direction: column;
    align-items: stretch;
  }

  .closure-extra-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    width: 100%;
  }

  /* En grid los botones estiran a su celda: sin width forzado ni recortes */
  .closure-extra-actions :deep(.v-btn) {
    height: 44px;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.02em;
  }
}

/* Tablets táctiles con layout de toolbar: mantener el target de 44px */
@media (min-width: 700px) and (pointer: coarse) {
  .closure-extra-actions :deep(.v-btn) {
    height: 44px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .closure-cta--ready {
    animation: none;
  }

  .closure-list :deep(.v-list-item) {
    transition: none;
  }

  .closure-attendance__fill {
    transition: none;
  }
}

/* Diálogos de captura: tarjeta con hairline propia (el estilo global la quita) */
.v-dialog .closure-dialog-card {
  --closure-hairline: rgb(var(--v-theme-on-surface), 0.12);
  border: 1px solid var(--closure-hairline) !important;
}

/* Encabezado editorial de micro-diálogos internos */
.closure-dialog-title {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 16px 20px 12px;
  font-size: 11px;
  line-height: 1.3;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-on-surface), 0.75);
  border-bottom: 1px solid var(--closure-hairline);
  white-space: normal;
}

.closure-dialog-title__sub {
  font-size: 11px;
  line-height: 1.4;
  font-weight: 400;
  letter-spacing: 0.01em;
  text-transform: none;
  color: rgb(var(--v-theme-on-surface), 0.55);
}

/* Formulario: campos como líneas de ticket */
.closure-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 18px 20px 10px;
}

.closure-field {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.closure-field__label {
  font-size: 10px;
  line-height: 1.4;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-on-surface), 0.55);
}

.closure-field__error {
  padding-top: 4px;
  font-size: 11px;
  line-height: 1.4;
  color: rgb(var(--v-theme-error));
}

/* El control hereda el ancho completo y pierde la caja global */
.closure-input :deep(.v-field) {
  --v-field-border-opacity: 1;
  border: none !important;
  border-radius: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
}

.closure-input :deep(.v-field:hover) {
  border-color: transparent !important;
}

.closure-input :deep(.v-field--focused) {
  border-color: transparent !important;
  box-shadow: none !important;
}

/* Subrayado: reposo/hover en on-surface; foco en primary del tenant */
.closure-input :deep(.v-field__outline::before) {
  border-color: rgb(var(--v-theme-on-surface), 0.18);
}

.closure-input :deep(.v-field:hover .v-field__outline::before) {
  border-color: rgb(var(--v-theme-on-surface), 0.32);
}

.closure-input :deep(.v-field--error .v-field__outline::before) {
  border-color: rgb(var(--v-theme-error));
}

.closure-input :deep(.v-field__outline::after) {
  transition: transform 0.15s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Texto del campo a 16px (evita el zoom automático en iOS) */
.closure-input :deep(.v-field__input),
.closure-input :deep(.v-select__selection) {
  font-size: 16px;
  font-variant-numeric: tabular-nums;
  color: rgb(var(--v-theme-on-surface), 0.9);
}

.closure-input :deep(.v-field__append-inner .v-icon),
.closure-input :deep(.v-field__clearable .v-icon) {
  font-size: 18px;
  color: rgb(var(--v-theme-on-surface), 0.55);
}

/* La etiqueta de Vuetify queda solo para lectores de pantalla:
   la etiqueta visible es la micro-etiqueta externa */
.closure-input :deep(.v-label) {
  position: absolute !important;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}

/* Stepper editorial para la cantidad del lote */
.closure-stepper {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-top: 2px;
}

.closure-stepper__btn.v-btn {
  width: 44px;
  height: 44px;
  min-width: 44px;
  border: 1px solid var(--closure-hairline);
  border-radius: 6px;
  color: rgb(var(--v-theme-on-surface), 0.75);
}

.closure-stepper__btn.v-btn:not(:disabled):active {
  background: rgb(var(--v-theme-on-surface), 0.06);
}

.closure-stepper__value {
  width: 64px;
  height: 44px;
  padding: 0;
  border: 0;
  border-bottom: 1px solid rgb(var(--v-theme-on-surface), 0.18);
  background: transparent;
  text-align: center;
  font-size: 18px;
  line-height: 44px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: rgb(var(--v-theme-on-surface), 0.9);
  outline: none;
  appearance: textfield;
  -moz-appearance: textfield;
}

.closure-stepper__value:focus-visible {
  border-bottom-color: rgb(var(--v-theme-primary));
  box-shadow: inset 0 -1px 0 rgb(var(--v-theme-primary));
}

.closure-stepper__value::-webkit-outer-spin-button,
.closure-stepper__value::-webkit-inner-spin-button {
  margin: 0;
  -webkit-appearance: none;
}

/* Línea de recibo: cantidad × servicio = importe */
.closure-batch-total {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding-top: 8px;
  border-top: 1px dashed rgb(var(--v-theme-on-surface), 0.22);
  font-size: 11px;
  line-height: 1.4;
  color: rgb(var(--v-theme-on-surface), 0.6);
}

.closure-batch-total__detail {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.closure-batch-total__amount {
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: rgb(var(--v-theme-on-surface), 0.85);
}

/* Acciones del diálogo: hairline superior y targets de 44px */
.closure-dialog-actions {
  gap: 4px;
  padding: 12px 16px 14px;
  border-top: 1px solid var(--closure-hairline);
}

.closure-dialog-btn.v-btn {
  height: 44px;
  padding-inline: 16px;
}

@media (prefers-reduced-motion: reduce) {
  .closure-input :deep(.v-field__outline::before),
  .closure-input :deep(.v-field__outline::after) {
    transition: none !important;
  }
}

/* Progreso de atención: fila hairline + micro-barra de 2px */
.closure-attendance {
  margin-bottom: 16px;
}

.closure-attendance__row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 6px;
}

.closure-attendance__value {
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: rgb(var(--v-theme-on-surface), 0.75);
}

.closure-attendance__track {
  height: 2px;
  overflow: hidden;
  background: var(--closure-hairline);
}

.closure-attendance__fill {
  width: 0;
  height: 100%;
  background: rgb(var(--v-theme-primary));
  transition: width 300ms ease;
}

.closure-attendance__track--done .closure-attendance__fill {
  background: rgb(var(--v-theme-success));
}

/* Filtros: texto subrayado, sin chips */
.closure-filters {
  display: flex;
  align-items: center;
  gap: 18px;
  overflow-x: auto;
  border-bottom: 1px solid var(--closure-hairline);
}

.closure-filter {
  all: unset;
  box-sizing: border-box;
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  padding: 7px 1px;
  margin-bottom: -1px;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-on-surface), 0.5);
  white-space: nowrap;
  transition: color 0.12s ease, border-color 0.12s ease;
}

.closure-filter:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 1px;
}

.closure-filter--active {
  color: rgb(var(--v-theme-on-surface), 0.85);
  border-bottom-color: rgb(var(--v-theme-success));
}

.closure-filter__count {
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.04em;
  font-variant-numeric: tabular-nums;
  color: rgb(var(--v-theme-on-surface), 0.4);
}

.closure-filter--active .closure-filter__count {
  color: rgb(var(--v-theme-on-surface), 0.6);
}

/* Datos de fila: hora tabular y monto a la derecha */
.closure-list__time {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: rgb(var(--v-theme-on-surface), 0.85);
}

.closure-list__amount {
  margin-right: 4px;
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: rgb(var(--v-theme-on-surface), 0.8);
  white-space: nowrap;
}

/* Acciones de Extras: toolbar compacta solo en desktop (≥700px) */
@media (min-width: 700px) {
  .closure-extra-actions {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .closure-extra-actions :deep(.v-btn) {
    min-height: 36px;
  }
}

.daily-closure__footer {
  border-top: 1px solid var(--closure-hairline);
}
</style>
