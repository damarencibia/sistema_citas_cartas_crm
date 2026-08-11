<template>
  <v-card variant="flat" border>
    <v-card-text>
      <div class="d-flex align-center justify-space-between mb-4 flex-wrap ga-2">
        <div>
          <h3 class="text-subtitle-1 font-weight-medium">Días Festivos / Cierres</h3>
          <div class="text-caption text-medium-emphasis">
            Días o horarios puntuales en los que el negocio no atiende
          </div>
        </div>
        <v-btn
          color="primary"
          variant="flat"
          size="small"
          @click="showForm = true"
        >
          <v-icon start>mdi-plus</v-icon>
          Agregar Excepción
        </v-btn>
      </div>

      <div v-if="holidays.length === 0" class="text-center text-medium-emphasis pa-6">
        <v-icon size="48" color="medium-emphasis">mdi-calendar-blank</v-icon>
        <p class="text-body-2 mt-2">No hay excepciones configuradas</p>
      </div>

      <div v-else class="d-flex flex-column ga-4">
        <div v-for="group in groupedHolidays" :key="group.key">
          <div class="text-caption font-weight-medium text-medium-emphasis mb-1 text-capitalize">
            {{ group.month }}
          </div>
          <v-list lines="two" density="compact">
            <v-list-item
              v-for="holiday in group.items"
              :key="holiday.id"
              :title="formatDate(holiday.date)"
              :subtitle="holiday.reason || (holiday.is_closed ? 'Cerrado todo el día' : `${formatTime(holiday.start_time)} - ${formatTime(holiday.end_time)}`)"
            >
              <template #prepend>
                <v-icon :color="holiday.is_closed ? 'error' : 'warning'">
                  {{ holiday.is_closed ? 'mdi-close-circle' : 'mdi-clock-outline' }}
                </v-icon>
              </template>
              <template #append>
                <v-btn
                  icon="mdi-delete"
                  size="small"
                  variant="text"
                  color="error"
                  @click="onDelete(holiday)"
                />
              </template>
            </v-list-item>
          </v-list>
        </div>
      </div>
    </v-card-text>

    <v-dialog v-model="showForm" max-width="420">
      <v-card>
        <v-card-title class="text-h6">Nueva Excepción</v-card-title>
        <v-card-text>
          <v-date-picker
            v-model="form.date"
            show-adjacent-months
            class="mb-3"
          />
          <v-switch
            v-model="form.is_closed"
            label="Cerrado todo el día"
            color="error"
            class="mb-2"
            hide-details
          />
          <template v-if="!form.is_closed">
            <v-row class="mt-2">
              <v-col cols="12" sm="6">
                <v-text-field v-model="form.start_time" label="Hora inicio" type="time" />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field v-model="form.end_time" label="Hora fin" type="time" />
              </v-col>
            </v-row>
          </template>
          <v-text-field v-model="form.reason" label="Motivo (opcional)" class="mt-2" />
        </v-card-text>
        <v-card-actions class="pa-4 pt-0">
          <v-spacer />
          <v-btn variant="text" @click="showForm = false">Cancelar</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :loading="loading"
            :disabled="!form.date"
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
import { ref, reactive, computed, onMounted } from 'vue';
import { useScheduleStore } from '../stores/schedule.store';
import { useNotification } from '@/shared/composables/useNotification';
import { useConfirm } from '@/shared/composables/useConfirm';
import type { HolidayException } from '../types/schedule.types';

const scheduleStore = useScheduleStore();
const notification = useNotification();
const { confirm } = useConfirm();

const showForm = ref(false);
const loading = ref(false);

const form = reactive({
  date: '',
  is_closed: true,
  start_time: '09:00',
  end_time: '18:00',
  reason: '',
});

const holidays = computed(() => scheduleStore.holidays);

interface HolidayGroup {
  key: string;
  month: string;
  items: HolidayException[];
}

const groupedHolidays = computed<HolidayGroup[]>(() => {
  const sorted = [...holidays.value].sort((a, b) => a.date.localeCompare(b.date));
  const groups: HolidayGroup[] = [];
  for (const h of sorted) {
    const key = h.date.slice(0, 7);
    let group = groups.find((g) => g.key === key);
    if (!group) {
      group = { key, month: formatMonth(h.date), items: [] };
      groups.push(group);
    }
    group.items.push(h);
  }
  return groups;
});

onMounted(async () => {
  await scheduleStore.fetchHolidays();
});

async function onCreate() {
  if (!form.date) return;
  loading.value = true;
  try {
    await scheduleStore.createHoliday({
      date: form.date,
      is_closed: form.is_closed,
      start_time: form.is_closed ? undefined : form.start_time,
      end_time: form.is_closed ? undefined : form.end_time,
      reason: form.reason || undefined,
    });
    showForm.value = false;
    form.date = '';
    form.is_closed = true;
    form.reason = '';
    notification.success('Excepción creada');
  } catch {
    notification.error('Error al crear excepción');
  } finally {
    loading.value = false;
  }
}

async function onDelete(holiday: HolidayException) {
  const ok = await confirm(`¿Eliminar la excepción del ${formatDate(holiday.date)}?`);
  if (!ok) return;
  try {
    await scheduleStore.deleteHoliday(holiday.id);
    notification.success('Excepción eliminada');
  } catch {
    notification.error('Error al eliminar');
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatMonth(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-MX', {
    month: 'long',
    year: 'numeric',
  });
}

function formatTime(t: string | null): string {
  return (t ?? '').slice(0, 5);
}
</script>
