<template>
  <v-card class="pa-4">
    <div class="d-flex align-center justify-space-between mb-3">
      <div class="text-subtitle-1 font-weight-semibold">Resumen por Empleado</div>
      <v-btn
        variant="text"
        size="x-small"
        icon
        @click="load"
      >
        <v-icon size="18">mdi-refresh</v-icon>
      </v-btn>
    </div>

    <div v-if="loading" class="text-center pa-4">
      <v-progress-circular indeterminate size="24" color="primary" />
    </div>

    <div v-else-if="!rows.length && !extrasTotal" class="text-center pa-4 text-medium-emphasis text-body-2">
      Sin datos para hoy
    </div>

    <template v-else>
      <v-table density="compact" class="bg-transparent">
        <thead>
          <tr>
            <th class="text-left text-caption font-weight-bold text-medium-emphasis">Empleado</th>
            <th class="text-center text-caption font-weight-bold text-medium-emphasis">Total</th>
            <th class="text-center text-caption font-weight-bold text-medium-emphasis">Asistió</th>
            <th class="text-center text-caption font-weight-bold text-medium-emphasis">No Show</th>
            <th class="text-center text-caption font-weight-bold text-medium-emphasis">Pendiente</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.employee_id">
            <td class="font-weight-medium" style="font-size: 13px;">{{ row.employee_name }}</td>
            <td class="text-center">
              <v-chip size="x-small" variant="tonal" color="default">{{ row.total }}</v-chip>
            </td>
            <td class="text-center">
              <v-chip size="x-small" variant="tonal" color="success">{{ row.completed }}</v-chip>
            </td>
            <td class="text-center">
              <v-chip size="x-small" variant="tonal" :color="row.no_show > 0 ? 'error' : 'default'">{{ row.no_show }}</v-chip>
            </td>
            <td class="text-center">
              <v-chip size="x-small" variant="tonal" :color="row.pending > 0 ? 'warning' : 'default'">{{ row.pending }}</v-chip>
            </td>
          </tr>
        </tbody>
      </v-table>

      <v-divider v-if="extrasTotal > 0" class="my-3" />

      <div v-if="extrasTotal > 0" class="d-flex align-center ga-2">
        <v-icon size="16" color="info">mdi-account-plus-outline</v-icon>
        <span class="text-body-2">
          <strong>{{ extrasTotal }}</strong> {{ extrasTotal === 1 ? 'extra registrado' : 'extras registrados' }}
        </span>
      </div>
    </template>
  </v-card>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { supabase } from '@/shared/api/supabase.client';
import { useTenantStore } from '@/shared/stores/tenant.store';

const tenantStore = useTenantStore();
const loading = ref(true);

interface SummaryRow {
  employee_id: string;
  employee_name: string;
  total: number;
  completed: number;
  no_show: number;
  pending: number;
}

const rows = ref<SummaryRow[]>([]);
const extrasTotal = ref(0);

async function load() {
  const tenantId = tenantStore.tenant?.id;
  if (!tenantId) {
    loading.value = false;
    return;
  }

  loading.value = true;

  try {
    const today = new Date().toISOString().split('T')[0];

    const [extrasResult, employeesResult, bookingsResult] = await Promise.all([
      (supabase as any)
        .from('daily_extras')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('date', today),
      supabase
        .from('employees')
        .select('id, first_name, last_name')
        .eq('tenant_id', tenantId),
      supabase
        .from('bookings')
        .select('employee_id, status')
        .eq('tenant_id', tenantId)
        .eq('date', today),
    ]);

    const employeeMap = new Map<string, string>();
    for (const e of employeesResult.data ?? []) {
      employeeMap.set(e.id, `${e.first_name} ${e.last_name}`);
    }

    const grouped = new Map<string, SummaryRow>();

    for (const b of bookingsResult.data ?? []) {
      if (!b.employee_id) continue;
      if (!grouped.has(b.employee_id)) {
        grouped.set(b.employee_id, {
          employee_id: b.employee_id,
          employee_name: employeeMap.get(b.employee_id) ?? 'Sin asignar',
          total: 0,
          completed: 0,
          no_show: 0,
          pending: 0,
        });
      }
      const row = grouped.get(b.employee_id)!;
      row.total++;
      if (b.status === 'completed') row.completed++;
      else if (b.status === 'no_show') row.no_show++;
      else if (['confirmed', 'in_progress', 'pending_confirmation'].includes(b.status)) row.pending++;
    }

    rows.value = Array.from(grouped.values()).sort((a, b) => b.total - a.total);
    extrasTotal.value = extrasResult.count ?? 0;
  } catch {
    rows.value = [];
    extrasTotal.value = 0;
  } finally {
    loading.value = false;
  }
}

defineExpose({ load });

onMounted(load);
</script>
