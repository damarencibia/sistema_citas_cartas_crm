<template>
  <div>
    <PageHeader title="Mis Estadísticas" subtitle="Tus números como trabajador" />

    <EmptyState
      v-if="ready && !myEmployeeId"
      title="Sin perfil de trabajador"
      description="No hay un perfil de empleado vinculado a tu cuenta. Contacta a un administrador."
      icon="mdi-account-badge-outline"
    />

    <template v-else>
      <div class="d-flex justify-center ga-2 mb-4 flex-wrap">
        <v-chip
          v-for="p in periods"
          :key="p.key"
          size="small"
          :variant="period === p.key ? 'flat' : 'tonal'"
          :color="period === p.key ? 'primary' : 'default'"
          @click="setPeriod(p.key)"
        >
          {{ p.label }}
        </v-chip>
      </div>

      <v-row>
        <v-col
          v-for="stat in cards"
          :key="stat.title"
          cols="6"
          md="3"
        >
          <v-card class="pa-4" :loading="loading">
            <div class="d-flex align-center ga-3">
              <div class="stat-icon" :style="{ backgroundColor: stat.bg }">
                <v-icon :color="stat.color" size="20">{{ stat.icon }}</v-icon>
              </div>
              <div style="min-width: 0;">
                <div class="stat-value">{{ stat.value }}</div>
                <div class="stat-label">{{ stat.title }}</div>
              </div>
            </div>
          </v-card>
        </v-col>
      </v-row>

      <v-row class="mt-2">
        <v-col cols="12" md="7">
          <v-card class="pa-4" :loading="loading">
            <div class="text-subtitle-1 font-weight-semibold mb-4">Últimos 7 días</div>
            <div class="d-flex align-end justify-space-between bars-row">
              <div
                v-for="bar in bars"
                :key="bar.date"
                class="d-flex flex-column align-center flex-grow-1"
                style="gap: 6px;"
              >
                <span class="text-caption text-medium-emphasis">{{ bar.count > 0 ? bar.count : '' }}</span>
                <div class="bar-track">
                  <div
                    class="bar-fill"
                    :style="{ height: `${bar.count > 0 ? Math.max(bar.pct / 100 * 120, 8) : 2}px` }"
                  />
                </div>
                <span class="text-caption text-medium-emphasis text-truncate" style="font-size: 10px;">
                  {{ bar.label }}
                </span>
              </div>
            </div>
          </v-card>
        </v-col>

        <v-col cols="12" md="5">
          <v-card class="pa-4">
            <div class="text-subtitle-1 font-weight-semibold mb-3">Próximas citas</div>
            <EmptyState
              v-if="!upcomingBookings.length"
              title="Sin citas próximas"
              description="No tienes citas programadas próximamente"
              icon="mdi-calendar-check-outline"
            />
            <v-list v-else density="compact" class="bg-transparent">
              <v-list-item
                v-for="b in upcomingBookings"
                :key="b.id"
                class="px-2"
              >
                <template #prepend>
                  <v-avatar color="primary" size="32" variant="tonal">
                    <span class="font-weight-medium" style="font-size: 11px;">
                      {{ (b.customer_name || 'C').charAt(0).toUpperCase() }}
                    </span>
                  </v-avatar>
                </template>
                <v-list-item-title class="font-weight-medium" style="font-size: 13px;">
                  {{ b.customer_name || 'Cliente' }}
                </v-list-item-title>
                <v-list-item-subtitle style="font-size: 12px;">
                  {{ b.service?.name ?? 'Servicio' }} · {{ b.date }} {{ b.start_time?.slice(0, 5) }}
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card>
        </v-col>
      </v-row>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import PageHeader from '@/shared/components/PageHeader.vue';
import EmptyState from '@/shared/components/EmptyState.vue';
import { useAuthStore } from '@/shared/stores/auth.store';
import { useEmployeeStore } from '../stores/employee.store';
import { bookingRepository } from '../repositories/booking.repository';
import type { Booking } from '../types/booking.types';

const authStore = useAuthStore();
const employeeStore = useEmployeeStore();

const myEmployeeId = ref<string | null>(null);
const ready = ref(false);
const loading = ref(true);
const period = ref<'today' | 'week' | 'month'>('week');
const periodBookings = ref<Booking[]>([]);
const barsBookings = ref<Booking[]>([]);

const periods = [
  { key: 'today', label: 'Hoy' },
  { key: 'week', label: 'Últimos 7 días' },
  { key: 'month', label: 'Este mes' },
] as const;

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const periodRange = computed(() => {
  const now = new Date();
  const todayIso = toIsoDate(now);
  if (period.value === 'today') return { from: todayIso, to: todayIso };
  if (period.value === 'week') {
    const from = new Date(now);
    from.setDate(now.getDate() - 6);
    return { from: toIsoDate(from), to: todayIso };
  }
  return { from: toIsoDate(new Date(now.getFullYear(), now.getMonth(), 1)), to: todayIso };
});

interface StatCard {
  title: string;
  value: string;
  icon: string;
  color: string;
  bg: string;
}

const cards = computed<StatCard[]>(() => {
  const list = periodBookings.value;
  const done = list.filter((b) => b.status === 'completed');
  const noShow = list.filter((b) => b.status === 'no_show');
  const income = done.reduce((sum, b) => sum + (b.service?.price ?? 0), 0);
  const attended = done.length + noShow.length;
  const pending = list.filter(
    (b) => b.status === 'pending_approval' || b.status === 'pending_confirmation',
  ).length;
  return [
    { title: 'Citas completadas', value: String(done.length), icon: 'mdi-calendar-check-outline', color: 'success', bg: 'rgba(62, 207, 142, 0.1)' },
    { title: 'Ingresos', value: `$${(income / 100).toFixed(2)}`, icon: 'mdi-cash-multiple', color: 'primary', bg: 'rgba(59, 130, 246, 0.1)' },
    {
      title: 'Tasa de asistencia',
      value: attended > 0 ? `${Math.round((done.length * 100) / attended)}%` : '—',
      icon: 'mdi-account-check-outline',
      color: 'info',
      bg: 'rgba(59, 130, 246, 0.1)',
    },
    { title: 'Por aprobar', value: String(pending), icon: 'mdi-clock-alert-outline', color: 'warning', bg: 'rgba(232, 168, 0, 0.1)' },
  ];
});

const bars = computed(() => {
  const now = new Date();
  const counts: Array<{ date: string; count: number }> = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    counts.push({ date: toIsoDate(d), count: 0 });
  }
  for (const b of barsBookings.value) {
    if (b.status === 'cancelled' || b.status === 'no_show') continue;
    const hit = counts.find((c) => c.date === b.date);
    if (hit) hit.count += 1;
  }
  const max = Math.max(1, ...counts.map((c) => c.count));
  return counts.map((c) => ({
    ...c,
    pct: Math.round((c.count * 100) / max),
    label: new Date(`${c.date}T12:00:00`).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' }),
  }));
});

const upcomingBookings = ref<Booking[]>([]);

async function loadData() {
  if (!myEmployeeId.value) {
    loading.value = false;
    ready.value = true;
    return;
  }
  loading.value = true;
  try {
    const now = new Date();
    const todayIso = toIsoDate(now);
    const weekFrom = new Date(now);
    weekFrom.setDate(now.getDate() - 6);
    const horizon = new Date(now);
    horizon.setDate(now.getDate() + 7);

    const [pb, bb, ub] = await Promise.all([
      bookingRepository.getByFilters({
        date_from: periodRange.value.from,
        date_to: periodRange.value.to,
        employee_id: myEmployeeId.value,
      }),
      bookingRepository.getByFilters({
        date_from: toIsoDate(weekFrom),
        date_to: todayIso,
        employee_id: myEmployeeId.value,
      }),
      bookingRepository.getByFilters({
        date_from: todayIso,
        date_to: toIsoDate(horizon),
        employee_id: myEmployeeId.value,
      }),
    ]);

    periodBookings.value = pb;
    barsBookings.value = bb;
    upcomingBookings.value = ub
      .filter((b) => ['pending_approval', 'pending_confirmation', 'confirmed', 'in_progress'].includes(b.status))
      .sort((a, b) => `${a.date} ${a.start_time ?? ''}`.localeCompare(`${b.date} ${b.start_time ?? ''}`))
      .slice(0, 5);
  } finally {
    loading.value = false;
    ready.value = true;
  }
}

function setPeriod(p: 'today' | 'week' | 'month') {
  period.value = p;
}

onMounted(async () => {
  await employeeStore.fetchEmployeesWithRoles();
  const userId = authStore.user?.id;
  const match = employeeStore.employees.find(
    (e) => e.user_id === userId || e.supabase_user_id === userId,
  );
  myEmployeeId.value = match?.id ?? null;
  await loadData();
});

watch(period, loadData);
</script>

<style scoped>
.stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  flex-shrink: 0;
}

.stat-value {
  font-size: 20px;
  font-weight: 600;
  line-height: 1.2;
}

.stat-label {
  font-size: 12px;
  color: var(--text-muted);
  font-weight: 450;
}

.bars-row {
  min-height: 160px;
  padding: 0 8px;
}

.bar-track {
  width: 22px;
  height: 120px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.bar-fill {
  width: 100%;
  max-width: 18px;
  border-radius: 4px 4px 0 0;
  background-color: rgb(var(--v-theme-primary));
  transition: height 0.3s ease;
}
</style>
