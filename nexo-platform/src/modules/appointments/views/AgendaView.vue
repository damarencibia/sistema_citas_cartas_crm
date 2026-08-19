<template>
  <div>
    <PageHeader :title="submoduleTitle" />

    <v-card v-if="tabKey === 'reservas'">
      <v-card-text class="pa-4">
        <div class="d-flex align-center justify-center ga-4 mb-4 flex-wrap">
          <v-select
            v-model="filters.employee_id"
            :items="employeeOptions"
            item-title="text"
            item-value="value"
            label="Empleado"
            density="compact"
            hide-details
            style="max-width: 240px;"
          />
          <v-btn-toggle
            v-model="viewSegment"
            density="compact"
            mandatory
            rounded="lg"
            color="primary"
          >
            <v-btn value="dia">Día</v-btn>
            <v-btn value="semana">Semana</v-btn>
            <v-btn value="mes">Mes</v-btn>
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

        <template v-else-if="viewSegment === 'mes'">
          <MonthCalendar
            :month-anchor="monthAnchor"
            :counts="monthCounts"
            :selected-date="filters.date"
            :loading="monthLoading"
            @select-date="onSelectMonthDay"
            @prev-month="shiftMonth(-1)"
            @next-month="shiftMonth(1)"
            @today="goToTodayMonth"
          />
        </template>

        <template v-else>
          <div class="d-flex align-center justify-space-between ga-2 mb-4 flex-wrap">
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
            <span v-if="filters.date" class="text-subtitle-2 text-medium-emphasis">
              Reservas del {{ formatDate(filters.date) }}
            </span>
            <v-btn
              size="small"
              rounded="lg"
              :color="dayClosed ? 'success' : 'primary'"
              :variant="dayClosed ? 'tonal' : 'flat'"
              :prepend-icon="dayClosed ? 'mdi-check-decagram' : 'mdi-clipboard-check-outline'"
              :disabled="!filters.employee_id"
              :title="
                dayClosed
                  ? 'Ver el resumen del cierre del día'
                  : filters.employee_id
                    ? 'Abrir el cierre del día'
                    : 'Selecciona un empleado para cerrar el día'
              "
              @click="openClosure"
            >
              {{ dayClosed ? 'Ver Resumen' : 'Cerrar Día' }}
            </v-btn>
          </div>

          <v-tabs-window v-model="reservasTab">
            <v-tabs-window-item value="all">
              <div v-if="bookingStore.loading" class="text-center pa-8">
                <v-progress-circular indeterminate color="primary" />
              </div>

              <div v-else-if="timeline.length === 0" class="text-center pa-8">
                <v-icon size="64" color="medium-emphasis">mdi-calendar-blank</v-icon>
                <p class="text-body-1 text-medium-emphasis mt-4">No hay reservas</p>
              </div>

              <template v-else>
                <template v-for="item in timeline" :key="item.key">
                  <BookingCard
                    v-if="item.type === 'booking'"
                    :booking="item.data"
                    :waitlist-entries="waitlistBySlot[item.data.id] ?? []"
                    @detail="openDetail"
                  />
                  <v-card v-else class="blocked-slot-card mb-2">
                    <v-card-text class="d-flex align-center ga-3 py-3">
                      <div class="blocked-slot-time text-body-2 font-weight-medium text-center">
                        <div>{{ item.data.start_time?.slice(0, 5) }}</div>
                        <div class="text-caption text-medium-emphasis">{{ item.data.end_time?.slice(0, 5) }}</div>
                      </div>
                      <v-divider vertical />
                      <div class="flex-grow-1" style="min-width: 0">
                        <div class="text-subtitle-2 text-truncate">Ocupado · bloqueado</div>
                        <div class="text-caption text-medium-emphasis text-truncate">
                          {{ item.data.reason || 'Bloqueo manual' }}
                        </div>
                      </div>
                      <v-btn
                        size="small"
                        variant="tonal"
                        color="error"
                        prepend-icon="mdi-lock-open-variant-outline"
                        @click="onReleaseBlock(item.data)"
                      >
                        Liberar
                      </v-btn>
                    </v-card-text>
                  </v-card>
                </template>
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

    <BookingForm
      :visible="showForm"
      :prefill="waitlistPrefill"
      @close="closeForm"
      @save="onCreateBooking"
    />

    <BookingDetailDrawer
      :visible="showDetail"
      :booking="selectedBooking"
      :waitlist-entries="selectedBooking ? waitlistBySlot[selectedBooking.id] ?? [] : []"
      :tenant-name="tenantStore.tenant?.name"
      show-actions
      @close="showDetail = false"
      @cancel-turn="onCancelTurn"
      @waitlist-convert="onDetailWaitlistConvert"
      @waitlist-remove="onWaitlistCancel"
    />

    <v-dialog v-model="whatsAppDialog" max-width="480">
      <v-card>
        <v-card-title class="d-flex align-center ga-2">
          <v-icon color="success">mdi-whatsapp</v-icon>
          Aviso al cliente
        </v-card-title>
        <v-card-text>
          <p class="text-body-2 mb-3">
            No se pudo abrir WhatsApp automáticamente. Copia el mensaje y envíalo por el chat del cliente:
          </p>
          <v-textarea
            :model-value="whatsAppDialogMessage"
            readonly
            auto-grow
            rows="4"
            variant="outlined"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="whatsAppDialog = false">Cerrar</v-btn>
          <v-btn
            v-if="whatsAppDialogDigits"
            color="success"
            prepend-icon="mdi-whatsapp"
            :href="whatsAppDialogHref"
            target="_blank"
          >
            Abrir chat
          </v-btn>
          <v-btn color="primary" prepend-icon="mdi-content-copy" @click="copyWhatsAppMessage">
            Copiar mensaje
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog
      v-if="smAndDown"
      v-model="showClosure"
      fullscreen
      class="closure-dialog"
    >
      <v-card class="d-flex flex-column h-100">
        <v-toolbar density="compact" color="transparent" class="flex-shrink-0">
          <v-icon color="primary" class="ml-4">mdi-clipboard-check-outline</v-icon>
          <v-toolbar-title class="text-subtitle-1 font-weight-semibold ml-1">
            Cierre del Día
          </v-toolbar-title>
          <v-spacer />
          <v-btn
            icon="mdi-close"
            size="small"
            variant="text"
            aria-label="Cerrar cierre del día"
            @click="showClosure = false"
          />
        </v-toolbar>

        <div class="px-4 pb-2 d-flex align-center ga-2 flex-wrap flex-shrink-0">
          <v-chip
            size="small"
            variant="tonal"
            color="primary"
            prepend-icon="mdi-calendar-today"
          >
            {{ filters.date ? formatDate(filters.date) : '' }}
          </v-chip>
          <v-chip size="small" variant="tonal" prepend-icon="mdi-account">
            {{ closureEmployeeName }}
          </v-chip>
        </div>
        <v-divider />

        <div class="flex-grow-1 d-flex flex-column closure-dialog__body">
          <DailyClosurePanel
            ref="closurePanelRef"
            :visible="showClosure"
            :employee-id="filters.employee_id"
            :date="filters.date ?? ''"
            :tenant-id="tenantId"
            @mark-attended="onMarkAttended"
            @mark-no-show="onMarkNoShow"
            @cancel-selection="onCancelSelection"
            @mark-all-attended="onMarkAllAttended"
            @remove-extra="onRemoveExtra"
            @closure-changed="dayClosed = $event"
            @close-dialog="showClosure = false"
          />
        </div>
      </v-card>
    </v-dialog>

    <v-navigation-drawer
      v-else
      v-model="showClosure"
      temporary
      location="right"
      width="600"
      :scrim="false"
      class="closure-drawer"
      :style="{ position: 'fixed', top: '0', height: '100dvh', zIndex: 1001 }"
    >
      <div class="d-flex flex-column h-100">
        <v-toolbar density="compact" color="transparent" class="flex-shrink-0">
          <v-icon color="primary" class="ml-4">mdi-clipboard-check-outline</v-icon>
          <v-toolbar-title class="text-subtitle-1 font-weight-semibold ml-1">
            Cierre del Día
          </v-toolbar-title>
          <v-spacer />
          <v-btn
            icon="mdi-close"
            size="small"
            variant="text"
            aria-label="Cerrar cierre del día"
            @click="showClosure = false"
          />
        </v-toolbar>

        <div class="px-4 pb-2 d-flex align-center ga-2 flex-wrap flex-shrink-0">
          <v-chip
            size="small"
            variant="tonal"
            color="primary"
            prepend-icon="mdi-calendar-today"
          >
            {{ filters.date ? formatDate(filters.date) : '' }}
          </v-chip>
          <v-chip size="small" variant="tonal" prepend-icon="mdi-account">
            {{ closureEmployeeName }}
          </v-chip>
        </div>
        <v-divider />

        <div class="flex-grow-1 d-flex flex-column closure-dialog__body">
          <DailyClosurePanel
            ref="closurePanelRef"
            :visible="showClosure"
            :employee-id="filters.employee_id"
            :date="filters.date ?? ''"
            :tenant-id="tenantId"
            @mark-attended="onMarkAttended"
            @mark-no-show="onMarkNoShow"
            @cancel-selection="onCancelSelection"
            @mark-all-attended="onMarkAllAttended"
            @remove-extra="onRemoveExtra"
            @closure-changed="dayClosed = $event"
            @close-dialog="showClosure = false"
          />
        </div>
      </div>
    </v-navigation-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useDisplay } from 'vuetify';
import PageHeader from '@/shared/components/PageHeader.vue';
import { useNotification } from '@/shared/composables/useNotification';
import { useBookingStore } from '../stores/booking.store';
import { useEmployeeStore } from '../stores/employee.store';
import BookingCard from '../components/BookingCard.vue';
import BookingForm from '../components/BookingForm.vue';
import BookingDetailDrawer from '../components/BookingDetailDrawer.vue';
import BookingApprovalList from '../components/BookingApprovalList.vue';
import WaitlistPanel from '../components/WaitlistPanel.vue';
import DailyClosurePanel from '../components/DailyClosurePanel.vue';
import WeekDayStrip from '../components/WeekDayStrip.vue';
import MonthCalendar from '../components/MonthCalendar.vue';
import type { WeekDayCount } from '../components/WeekDayStrip.vue';
import { dailyExtrasRepository } from '../repositories/daily-extras.repository';
import { dailyClosureRepository } from '../repositories/daily-closure.repository';
import { bookingRepository } from '../repositories/booking.repository';
import { blockedSlotsRepository } from '../repositories/blocked-slots.repository';
import { useTenantStore } from '@/shared/stores/tenant.store';
import { useAuthStore } from '@/shared/stores/auth.store';
import { formatDate } from '@/shared/utils/format';
import type { Booking, BookingFormPrefill, CreateBookingDTO, WaitlistEntry, DailyExtra, BlockedSlot } from '../types/booking.types';

const bookingStore = useBookingStore();
const employeeStore = useEmployeeStore();
const tenantStore = useTenantStore();
const authStore = useAuthStore();
const notification = useNotification();
const route = useRoute();
const router = useRouter();
const { smAndDown } = useDisplay();

const reservasTab = ref<'all' | 'approval'>('all');
const viewSegment = ref<'dia' | 'semana' | 'mes'>('dia');
const weekAnchor = ref(new Date().toISOString().split('T')[0]);
const weekLoading = ref(false);
const weekCounts = ref<Record<string, WeekDayCount>>({});
const monthAnchor = ref(new Date().toISOString().split('T')[0]);
const monthLoading = ref(false);
const monthCounts = ref<Record<string, WeekDayCount>>({});
const showForm = ref(false);
const showDetail = ref(false);
const showClosure = ref(false);
const whatsAppDialog = ref(false);
const whatsAppDialogMessage = ref('');
const whatsAppDialogDigits = ref<string | null>(null);
const dayClosed = ref(false);
const selectedBooking = ref<Booking | null>(null);
const dayBlocks = ref<BlockedSlot[]>([]);
const closurePanelRef = ref<InstanceType<typeof DailyClosurePanel> | null>(null);
const waitlistPrefill = ref<BookingFormPrefill | null>(null);
const waitlistConversionTarget = ref<WaitlistEntry | null>(null);
const isEmployeeView = computed(() => authStore.userRole === 'employee');
const myEmployeeId = ref<string | null>(null);

const filters = reactive({
  date: new Date().toISOString().split('T')[0] as string | null,
  employee_id: null as string | null,
});

const tabKey = computed<'reservas' | 'espera'>(() => {
  const t = route.query.tab;
  return t === 'espera' ? 'espera' : 'reservas';
});

const submoduleTitle = computed(() => {
  switch (tabKey.value) {
    case 'espera': return 'Espera';
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

const closureEmployeeName = computed(() => {
  if (!filters.employee_id) return 'Sin empleado';
  const emp = employeeStore.employees.find((e) => e.id === filters.employee_id);
  return emp ? `${emp.first_name} ${emp.last_name}` : 'Empleado';
});

const waitlistBySlot = computed<Record<string, WaitlistEntry[]>>(() => {
  const map: Record<string, WaitlistEntry[]> = {};
  for (const b of bookingStore.bookings) {
    if (!b.date || !b.start_time) continue;
    const time = b.start_time.slice(0, 5);
    const matches = bookingStore.waitlist.filter(
      (e) =>
        (e.status === 'waiting' || e.status === 'notified') &&
        (!e.entry_expires_at || new Date(e.entry_expires_at) > new Date()) &&
        e.preferred_date === b.date &&
        (e.preferred_times?.some((t) => t.slice(0, 5) === time) ||
          (!!e.preferred_time_start && e.preferred_time_start.slice(0, 5) === time)) &&
        (e.employee_id === null || e.employee_id === b.employee_id),
    );
    if (matches.length) map[b.id] = matches;
  }
  return map;
});

const timeline = computed(() => {
  const bookings = bookingStore.bookings.map((b) => ({
    type: 'booking' as const,
    data: b,
    key: `booking-${b.id}`,
    start: b.start_time ?? '',
  }));
  const blocks = dayBlocks.value.map((blk) => ({
    type: 'block' as const,
    data: blk,
    key: `block-${blk.id}`,
    start: blk.start_time ?? '',
  }));
  return [...bookings, ...blocks].sort((a, b) => a.start.localeCompare(b.start));
});

function firstWaitlistClient(booking: Booking): WaitlistEntry | null {
  const active = (waitlistBySlot.value[booking.id] ?? []).filter(
    (e) => e.status === 'waiting' || e.status === 'notified',
  );
  return (
    [...active].sort(
      (a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at),
    )[0] ?? null
  );
}

const whatsAppDialogHref = computed(() =>
  whatsAppDialogDigits.value
    ? `https://wa.me/${whatsAppDialogDigits.value}?text=${encodeURIComponent(whatsAppDialogMessage.value)}`
    : '',
);

function buildAssignmentMessage(booking: Booking, customerName: string, accessToken: string | null): string {
  const tenantName = tenantStore.tenant?.name ?? 'nuestro negocio';
  const serviceName = booking.service?.name ?? 'tu servicio';
  const dateLabel = formatDate(booking.date, "EEEE d 'de' MMMM");
  const timeLabel = booking.start_time?.slice(0, 5) ?? '';
  const base = `Hola ${customerName}, tu turno para ${serviceName} el ${dateLabel} a las ${timeLabel} fue aprobado en la agenda de ${tenantName}.`;
  if (accessToken && tenantStore.tenant?.slug) {
    const link = `${window.location.origin}/${tenantStore.tenant.slug}/reservas/${accessToken}`;
    return `${base} ¿Vas a asistir? Confirma aquí: ${link}`;
  }
  return `${base} Si no puedes asistir, avísanos por este chat.`;
}

function normalizeWhatsAppDigits(phone: string | null): string | null {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, '');
  if (digits.length === 8) digits = `53${digits}`;
  return digits || null;
}

function openWhatsAppChat(booking: Booking, entry: WaitlistEntry, accessToken: string | null) {
  const message = buildAssignmentMessage(booking, entry.customer_name, accessToken);
  const digits = normalizeWhatsAppDigits(entry.customer_phone);
  whatsAppDialogMessage.value = message;
  whatsAppDialogDigits.value = digits;
  if (!digits) {
    whatsAppDialog.value = true;
    return;
  }
  const win = window.open(`https://wa.me/${digits}?text=${encodeURIComponent(message)}`, '_blank');
  if (!win) whatsAppDialog.value = true;
}

async function copyWhatsAppMessage() {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(whatsAppDialogMessage.value);
    notification.success('Mensaje copiado');
  }
}

async function loadDayBlocks() {
  if (!tenantId.value || !filters.employee_id || !filters.date) {
    dayBlocks.value = [];
    return;
  }
  try {
    dayBlocks.value = await blockedSlotsRepository.getByEmployeeAndDate(
      tenantId.value,
      filters.employee_id,
      filters.date,
    );
  } catch {
    dayBlocks.value = [];
  }
}

function openClosure() {
  if (!filters.employee_id || !filters.date) return;
  showClosure.value = true;
  employeeStore.fetchEmployeeServices(filters.employee_id);
}

async function loadDayClosed() {
  if (!filters.employee_id || !filters.date) {
    dayClosed.value = false;
    return;
  }
  try {
    const closure = await dailyClosureRepository.getByEmployeeAndDate(
      filters.employee_id,
      filters.date,
    );
    dayClosed.value = !!closure;
  } catch {
    dayClosed.value = false;
  }
}

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

const monthDates = computed(() => {
  const d = new Date(monthAnchor.value + 'T12:00:00');
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return { start: toIsoDate(first), end: toIsoDate(last) };
});

async function loadMonthCounts() {
  monthLoading.value = true;
  try {
    const { start, end } = monthDates.value;
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
    monthCounts.value = counts;
  } finally {
    monthLoading.value = false;
  }
}

function shiftMonth(months: number) {
  const d = new Date(monthAnchor.value + 'T12:00:00');
  d.setMonth(d.getMonth() + months);
  monthAnchor.value = toIsoDate(d);
}

function goToTodayMonth() {
  monthAnchor.value = new Date().toISOString().split('T')[0];
}

function onSelectMonthDay(day: string) {
  filters.date = day;
  viewSegment.value = 'dia';
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

watch(() => viewSegment.value, (segment) => {
  if (segment === 'semana') loadWeekCounts();
  if (segment === 'mes') loadMonthCounts();
});

watch(() => filters.employee_id, () => {
  if (viewSegment.value === 'semana') loadWeekCounts();
  if (viewSegment.value === 'mes') loadMonthCounts();
});

watch(() => [filters.employee_id, filters.date], loadDayClosed, { immediate: true });

watch(() => [filters.employee_id, filters.date], loadDayBlocks, { immediate: true });

watch(weekAnchor, () => {
  if (viewSegment.value === 'semana') loadWeekCounts();
});

watch(monthAnchor, () => {
  if (viewSegment.value === 'mes') loadMonthCounts();
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
    filters.employee_id = myEmployeeId.value;
  } else {
    const firstEmployeeId = employeeStore.activeEmployees[0]?.id ?? null;
    filters.employee_id = firstEmployeeId;
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
  });
  if (tabKey.value === 'reservas') bookingStore.fetchBookings();
}, { deep: true });

async function loadForTab(tab: string) {
  if (tab === 'reservas') {
    await bookingStore.fetchBookings({
      date: filters.date ?? undefined,
      employee_id: filters.employee_id,
    });
  }
}

async function refreshBookings() {
  await bookingStore.fetchBookings();
}

function openCreateForm() {
  waitlistConversionTarget.value = null;
  waitlistPrefill.value = null;
  showForm.value = true;
}

function closeForm() {
  showForm.value = false;
  waitlistPrefill.value = null;
  waitlistConversionTarget.value = null;
}

function openDetail(booking: Booking) {
  selectedBooking.value = booking;
  showDetail.value = true;
}

async function onCreateBooking(data: CreateBookingDTO) {
  try {
    await bookingStore.createBooking(data);
    showForm.value = false;

    const entry = waitlistConversionTarget.value;
    waitlistConversionTarget.value = null;
    waitlistPrefill.value = null;

    if (entry) {
      try {
        await bookingStore.markWaitlistConverted(entry.id);
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

async function onCancelTurn(data: { assign: boolean; keepBlocked: boolean; reason: string }) {
  const booking = selectedBooking.value;
  if (!booking) return;
  try {
    if (data.assign) {
      const firstClient = firstWaitlistClient(booking);
      if (!firstClient) {
        notification.error('No hay cliente en la cola para este turno');
        return;
      }
      const result = await bookingStore.transferBookingToWaitlist(booking.id, firstClient.id);
      notification.success('Turno asignado al primer cliente de la cola');
      await bookingStore.fetchWaitlist();
      openWhatsAppChat(booking, firstClient, result.customer_access_token);
    } else {
      await bookingStore.updateStatus(
        booking.id,
        'cancelled',
        data.reason || undefined,
        'employee',
      );
      if (data.keepBlocked && booking.employee_id) {
        await blockedSlotsRepository.create({
          tenant_id: booking.tenant_id,
          employee_id: booking.employee_id ?? '',
          date: booking.date,
          start_time: booking.start_time?.slice(0, 5) || '',
          end_time: booking.end_time?.slice(0, 5) || '',
          reason: data.reason || 'Turno cancelado',
          created_by: authStore.user?.id ?? null,
        });
        notification.success('Turno cancelado y horario bloqueado');
      } else {
        notification.success('Turno cancelado');
      }
    }
    showDetail.value = false;
    await refreshBookings();
    await loadDayBlocks();
  } catch (e) {
    notification.error((e as Error).message || 'Error al cancelar turno');
  }
}

async function onReleaseBlock(block: BlockedSlot) {
  try {
    await blockedSlotsRepository.remove(block.id);
    notification.success('Bloqueo liberado');
    await loadDayBlocks();
  } catch {
    notification.error('Error al liberar el bloqueo');
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
function onDetailWaitlistConvert(entry: WaitlistEntry) {
  const b = selectedBooking.value;
  if (!b) return;
  waitlistConversionTarget.value = entry;
  waitlistPrefill.value = {
    service_id: b.service_id,
    employee_id: b.employee_id ?? undefined,
    date: b.date,
    start_time: b.start_time?.slice(0, 5),
    customer_name: entry.customer_name,
    customer_email: entry.customer_email,
    customer_phone: entry.customer_phone ?? undefined,
  };
  showForm.value = true;
}

async function onWaitlistCancel(entry: WaitlistEntry) {
  try {
    await bookingStore.cancelWaitlistEntry(entry.id);
    await bookingStore.fetchWaitlist();
    notification.success('Entrada de waitlist cancelada');
  } catch {
    notification.error('Error al cancelar waitlist');
  }
}

function onWaitlistConvert(entry: WaitlistEntry) {
  waitlistConversionTarget.value = entry;
  waitlistPrefill.value = {
    service_id: entry.service_id,
    employee_id: entry.employee_id ?? undefined,
    date: entry.preferred_date,
    start_time: entry.preferred_times?.[0] ?? undefined,
    customer_name: entry.customer_name,
    customer_email: entry.customer_email,
    customer_phone: entry.customer_phone ?? undefined,
  };
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

async function onCancelSelection(booking: Booking) {
  try {
    await bookingStore.updateStatus(booking.id, 'confirmed');
    notification.success('Selección cancelada — cita vuelta a pendiente');
    await refreshBookings();
    closurePanelRef.value?.loadExtras();
  } catch (e) {
    notification.error((e as Error).message || 'Error al cancelar selección');
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

<style scoped>
.closure-dialog__body {
  min-height: 0;
}
</style>

<style>
.closure-drawer {
  position: fixed !important;
  top: 0 !important;
  height: 100vh !important;
  height: 100dvh !important;
  z-index: 1001 !important;
  transition-property: transform !important;
  transition-duration: 0.35s !important;
  transition-timing-function: cubic-bezier(0.22, 1, 0.36, 1) !important;
  will-change: transform;
  box-shadow: none !important;
  border-right: none !important;
  border-left: 1px solid rgb(var(--v-border)) !important;
}

.closure-drawer :deep(.v-navigation-drawer__content) {
  overscroll-behavior: contain;
}

.blocked-slot-card {
  border-left: 4px solid rgb(var(--v-theme-error));
  background: color-mix(in srgb, rgb(var(--v-theme-error)) 8%, transparent);
}

.blocked-slot-time {
  min-width: 50px;
  flex-shrink: 0;
}
</style>
