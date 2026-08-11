<template>
  <v-card variant="flat" border>
    <v-card-text>
      <div class="d-flex align-center ga-2 mb-1 flex-wrap">
        <div class="me-2">
          <h3 class="text-subtitle-1 font-weight-medium">Slots Fijos</h3>
          <div class="text-caption text-medium-emphasis">
            Horas concretas que se ofrecen sí o sí (tienen prioridad sobre el horario semanal)
          </div>
        </div>
        <v-spacer />
        <v-btn
          color="primary"
          variant="flat"
          size="small"
          prepend-icon="mdi-plus"
          :disabled="!selectedEmployeeId"
          @click="openAdd"
        >
          Agregar slot
        </v-btn>
      </div>

      <EmployeeSelect
        :model-value="selectedEmployeeId"
        label="Slots de"
        class="mt-2 mb-3"
        style="max-width: 320px"
        :allowed-ids="allowedIds"
        :include-default="!isEmployeeView"
        :disabled="isEmployeeView"
        @update:model-value="onEmployeeChange"
      />

      <div v-if="!selectedEmployeeId" class="text-center text-medium-emphasis pa-6">
        Selecciona un empleado para ver sus slots fijos
      </div>

      <div v-else-if="loading" class="text-center pa-6">
        <v-progress-circular indeterminate size="32" />
      </div>

      <div v-else-if="noSlots" class="text-center text-medium-emphasis pa-6">
        <v-icon size="40" color="medium-emphasis">mdi-clock-outline</v-icon>
        <p class="text-body-2 mt-2">No hay slots fijos configurados</p>
      </div>

      <div v-else class="d-flex flex-column ga-3 mt-3">
        <div v-for="group in grouped" :key="group.day.value">
          <div
            v-if="group.slots.length > 0"
            class="text-caption font-weight-medium text-medium-emphasis mb-1"
          >
            {{ group.day.label }}
          </div>
          <div class="d-flex flex-wrap ga-2">
            <v-chip
              v-for="slot in group.slots"
              :key="slot.id"
              variant="tonal"
              color="primary"
              size="small"
              prepend-icon="mdi-clock-outline"
            >
              {{ formatTime(slot.start_time) }} – {{ formatTime(slot.end_time) }}
              <template #append>
                <v-btn
                  icon="mdi-close"
                  size="x-small"
                  variant="text"
                  density="comfortable"
                  @click="onDelete(slot)"
                />
              </template>
            </v-chip>
          </div>
        </div>
      </div>
    </v-card-text>

    <v-dialog v-model="showForm" max-width="420">
      <v-card>
        <v-card-title class="text-h6">Nuevo Slot Fijo</v-card-title>
        <v-card-text>
          <v-select
            v-model="form.day_of_week"
            :items="daysOfWeek"
            item-title="label"
            item-value="value"
            label="Día"
            density="compact"
            class="mb-2"
          />
          <v-row>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="form.start_time"
                label="Hora inicio"
                type="time"
                density="compact"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="form.end_time"
                label="Hora fin"
                type="time"
                density="compact"
              />
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions class="pa-4 pt-0">
          <v-spacer />
          <v-btn variant="text" @click="showForm = false">Cancelar</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :loading="saving"
            :disabled="!form.day_of_week || !form.start_time || !form.end_time || form.end_time <= form.start_time"
            @click="onCreate"
          >
            Crear
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue';
import { useScheduleStore } from '../stores/schedule.store';
import { useNotification } from '@/shared/composables/useNotification';
import { useConfirm } from '@/shared/composables/useConfirm';
import { useAuthStore } from '@/shared/stores/auth.store';
import { useEmployeeStore } from '../stores/employee.store';
import EmployeeSelect from './EmployeeSelect.vue';
import { DEFAULT_SCHEDULE_ID } from '../types/schedule.types';
import type { FixedSlotDefinition } from '../types/schedule.types';

const scheduleStore = useScheduleStore();
const notification = useNotification();
const authStore = useAuthStore();
const employeeStore = useEmployeeStore();
const { confirm } = useConfirm();

const selectedEmployeeId = ref<string | null>(null);
const showForm = ref(false);
const saving = ref(false);
const loading = computed(() => scheduleStore.loading);

const isEmployeeView = computed(() => authStore.userRole === 'employee');
const myEmployeeId = ref<string | null>(null);

const allowedIds = computed(() =>
  isEmployeeView.value && myEmployeeId.value ? [myEmployeeId.value] : undefined,
);

const daysOfWeek = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
];

const form = reactive({
  day_of_week: 1,
  start_time: '10:00',
  end_time: '11:00',
});

function resolveEmployeeId(id: string | null): string | null {
  return id === DEFAULT_SCHEDULE_ID ? null : id;
}

async function load() {
  await scheduleStore.fetchFixedSlots(resolveEmployeeId(selectedEmployeeId.value));
}

const grouped = computed(() => {
  const map = new Map<number, FixedSlotDefinition[]>();
  for (const slot of scheduleStore.fixedSlots) {
    const arr = map.get(slot.day_of_week) ?? [];
    arr.push(slot);
    map.set(slot.day_of_week, arr);
  }
  return daysOfWeek.map((day) => ({ day, slots: map.get(day.value) ?? [] }));
});

const noSlots = computed(() => scheduleStore.fixedSlots.length === 0);

function formatTime(t: string): string {
  return (t ?? '').slice(0, 5);
}

function openAdd() {
  form.day_of_week = 1;
  form.start_time = '10:00';
  form.end_time = '11:00';
  showForm.value = true;
}

async function onCreate() {
  saving.value = true;
  try {
    await scheduleStore.createFixedSlot({
      employee_id: resolveEmployeeId(selectedEmployeeId.value) ?? undefined,
      day_of_week: form.day_of_week,
      start_time: form.start_time,
      end_time: form.end_time,
    });
    showForm.value = false;
    notification.success('Slot fijo creado');
  } catch {
    notification.error('Error al crear slot fijo');
  } finally {
    saving.value = false;
  }
}

async function onDelete(slot: FixedSlotDefinition) {
  const ok = await confirm(`¿Eliminar el slot fijo ${formatTime(slot.start_time)} – ${formatTime(slot.end_time)}?`);
  if (!ok) return;
  try {
    await scheduleStore.deleteFixedSlot(slot.id);
    notification.success('Slot fijo eliminado');
  } catch {
    notification.error('Error al eliminar slot');
  }
}

async function onEmployeeChange(id: string | null) {
  selectedEmployeeId.value = id;
}

watch(selectedEmployeeId, async (id) => {
  if (!id) {
    scheduleStore.fixedSlots = [];
    return;
  }
  await load();
});

onMounted(async () => {
  await employeeStore.fetchEmployeesWithRoles();
  if (isEmployeeView.value) {
    const userId = authStore.user?.id;
    const match = employeeStore.employees.find(
      (e) => e.user_id === userId || e.supabase_user_id === userId,
    );
    myEmployeeId.value = match?.id ?? null;
    if (myEmployeeId.value) selectedEmployeeId.value = myEmployeeId.value;
  } else {
    selectedEmployeeId.value = DEFAULT_SCHEDULE_ID;
  }
});
</script>
