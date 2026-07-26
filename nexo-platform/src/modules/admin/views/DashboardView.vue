<template>
  <div>
    <PageHeader title="Dashboard" subtitle="Resumen de tu negocio" />

    <v-row>
      <v-col
        v-for="stat in stats"
        :key="stat.title"
        cols="6"
        md="3"
      >
        <v-card class="dashboard-stat pa-4" :loading="loading">
          <div class="d-flex align-center ga-3">
            <div class="dashboard-stat__icon" :style="{ backgroundColor: stat.bgColor }">
              <v-icon :color="stat.color" size="20">{{ stat.icon }}</v-icon>
            </div>
            <div>
              <div class="dashboard-stat__value">{{ stat.value }}</div>
              <div class="dashboard-stat__label">{{ stat.title }}</div>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <v-row class="mt-2">
      <v-col cols="12" md="8">
        <v-card class="pa-4">
          <div class="text-subtitle-1 font-weight-semibold mb-3">Próximas Citas</div>
          <EmptyState
            v-if="!upcomingBookings.length"
            title="Sin citas próximas"
            description="No hay citas programadas para hoy"
            icon="mdi-calendar-check-outline"
          />
          <v-list v-else density="compact" class="bg-transparent">
            <v-list-item v-for="booking in upcomingBookings" :key="booking.id" class="px-2">
              <template #prepend>
                <v-avatar :color="booking.color" size="32" variant="tonal">
                  <span class="font-weight-medium" style="font-size: 11px;">{{ booking.initials }}</span>
                </v-avatar>
              </template>
              <v-list-item-title class="font-weight-medium" style="font-size: 13px;">
                {{ booking.customer }}
              </v-list-item-title>
              <v-list-item-subtitle style="font-size: 12px;">
                {{ booking.service }} · {{ booking.time }}
              </v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-card>
      </v-col>

      <v-col cols="12" md="4">
        <v-card class="pa-4">
          <div class="text-subtitle-1 font-weight-semibold mb-3">Resumen</div>
          <v-list density="compact" class="bg-transparent">
            <v-list-item v-for="item in summary" :key="item.label" class="px-2">
              <v-list-item-title class="text-body-2">{{ item.label }}</v-list-item-title>
              <template #append>
                <v-chip :color="item.color" size="x-small" variant="tonal" class="font-weight-medium">
                  {{ item.value }}
                </v-chip>
              </template>
            </v-list-item>
          </v-list>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { supabase } from '@/shared/api/supabase.client';
import { useTenantStore } from '@/shared/stores/tenant.store';
import PageHeader from '@/shared/components/PageHeader.vue';
import EmptyState from '@/shared/components/EmptyState.vue';

const tenantStore = useTenantStore();
const loading = ref(true);

const stats = reactive([
  { title: 'Citas Hoy', value: '0', icon: 'mdi-calendar-today', color: 'primary', bgColor: 'rgba(62, 207, 142, 0.1)' },
  { title: 'Clientes', value: '0', icon: 'mdi-account-group-outline', color: 'info', bgColor: 'rgba(59, 130, 246, 0.1)' },
  { title: 'Servicios', value: '0', icon: 'mdi-content-cut', color: 'warning', bgColor: 'rgba(232, 168, 0, 0.1)' },
  { title: 'Empleados', value: '0', icon: 'mdi-account-hard-hat-outline', color: 'success', bgColor: 'rgba(62, 207, 142, 0.1)' },
]);

interface UpcomingBooking {
  id: string;
  customer: string;
  service: string;
  time: string;
  color: string;
  initials: string;
}

const upcomingBookings = ref<UpcomingBooking[]>([]);

const summary = reactive([
  { label: 'Pendientes', value: '0', color: 'warning' },
  { label: 'Confirmadas', value: '0', color: 'info' },
  { label: 'Completadas', value: '0', color: 'success' },
  { label: 'Canceladas', value: '0', color: 'error' },
]);

onMounted(async () => {
  const tenantId = tenantStore.tenant?.id;
  if (!tenantId) {
    loading.value = false;
    return;
  }

  try {
    const today = new Date().toISOString().split('T')[0];

    const [{ count: bookingsToday }, { count: customers }, { count: services }, { count: employees }, { data: todayBookings }, { count: pending }, { count: confirmed }, { count: completed }, { count: cancelled }] = await Promise.all([
      supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('date', today),
      supabase.from('customers').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId),
      supabase.from('services').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId),
      supabase.from('employees').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId),
      supabase.from('bookings').select('*, services(name)').eq('tenant_id', tenantId).eq('date', today).order('start_time', { ascending: true }).limit(10),
      supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'pending'),
      supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'confirmed'),
      supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'completed'),
      supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'cancelled'),
    ]);

    stats[0].value = String(bookingsToday ?? 0);
    stats[1].value = String(customers ?? 0);
    stats[2].value = String(services ?? 0);
    stats[3].value = String(employees ?? 0);

    summary[0].value = String(pending ?? 0);
    summary[1].value = String(confirmed ?? 0);
    summary[2].value = String(completed ?? 0);
    summary[3].value = String(cancelled ?? 0);

    upcomingBookings.value = (todayBookings ?? []).map((b: Record<string, unknown>) => ({
      id: b.id as string,
      customer: (b.customer_name as string) ?? 'Cliente',
      service: ((b.services as Record<string, unknown> | null)?.name as string) ?? 'Servicio',
      time: (b.start_time as string)?.slice(0, 5) ?? '',
      color: 'primary',
      initials: ((b.customer_name as string ?? 'C')).charAt(0).toUpperCase(),
    }));
  } catch {
    // Keep default zeros on error
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.dashboard-stat__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  flex-shrink: 0;
}

.dashboard-stat__value {
  font-size: 20px;
  font-weight: 600;
  line-height: 1.2;
}

.dashboard-stat__label {
  font-size: 12px;
  color: var(--text-muted);
  font-weight: 450;
}
</style>
