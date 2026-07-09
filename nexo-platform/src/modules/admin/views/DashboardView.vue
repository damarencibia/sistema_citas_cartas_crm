<template>
  <div>
    <PageHeader title="Dashboard" subtitle="Resumen de tu negocio" />

    <v-row>
      <v-col
        v-for="stat in stats"
        :key="stat.title"
        cols="12"
        md="3"
      >
        <v-card class="pa-4" :loading="loading">
          <div class="d-flex align-center">
            <v-avatar
              :color="stat.color"
              class="mr-4"
              size="48"
              variant="tonal"
            >
              <v-icon>{{ stat.icon }}</v-icon>
            </v-avatar>
            <div>
              <p class="text-h5 font-weight-bold">{{ stat.value }}</p>
              <p class="text-body-2 text-medium-emphasis">{{ stat.title }}</p>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <v-row class="mt-4">
      <v-col cols="12" md="8">
        <v-card title="Próximas Citas" class="pa-4" :loading="loading">
          <EmptyState
            v-if="!upcomingBookings.length"
            title="Sin citas próximas"
            description="No hay citas programadas para hoy"
            icon="mdi-calendar-check"
          />
          <v-list v-else>
            <v-list-item v-for="booking in upcomingBookings" :key="booking.id">
              <template #prepend>
                <v-avatar :color="booking.color" size="40">{{ booking.initials }}</v-avatar>
              </template>
              <v-list-item-title>{{ booking.customer }}</v-list-item-title>
              <v-list-item-subtitle>
                {{ booking.service }} - {{ booking.time }}
              </v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-card>
      </v-col>

      <v-col cols="12" md="4">
        <v-card title="Resumen" class="pa-4" :loading="loading">
          <v-list density="compact">
            <v-list-item v-for="item in summary" :key="item.label">
              <template #append>
                <v-chip :color="item.color" size="small">{{ item.value }}</v-chip>
              </template>
              <v-list-item-title>{{ item.label }}</v-list-item-title>
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
  { title: 'Citas Hoy', value: '0', icon: 'mdi-calendar-today', color: 'primary' },
  { title: 'Clientes', value: '0', icon: 'mdi-account-group', color: 'success' },
  { title: 'Servicios', value: '0', icon: 'mdi-content-cut', color: 'warning' },
  { title: 'Empleados', value: '0', icon: 'mdi-account-hard-hat', color: 'info' },
]);

const upcomingBookings = ref<any[]>([]);

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

    upcomingBookings.value = (todayBookings ?? []).map((b: any) => ({
      id: b.id,
      customer: b.customer_name ?? 'Cliente',
      service: (b as any).services?.name ?? 'Servicio',
      time: b.start_time?.slice(0, 5) ?? '',
      color: 'primary',
      initials: ((b.customer_name ?? 'C') as string).charAt(0).toUpperCase(),
    }));
  } catch {
    // Keep default zeros on error
  } finally {
    loading.value = false;
  }
});
</script>
