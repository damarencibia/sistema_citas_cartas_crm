<template>
  <div class="holiday-calendar">
    <div class="d-flex align-center justify-space-between mb-4">
      <h3 class="text-subtitle-1 font-weight-medium">Días Festivos / Cierres</h3>
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

    <v-list v-if="holidays.length > 0" lines="two">
      <v-list-item
        v-for="holiday in holidays"
        :key="holiday.id"
        :title="formatDate(holiday.date)"
        :subtitle="holiday.reason || (holiday.is_closed ? 'Cerrado todo el día' : `${holiday.start_time} - ${holiday.end_time}`)"
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

    <v-card v-else variant="tonal" class="pa-6 text-center">
      <v-icon size="48" color="medium-emphasis">mdi-calendar-blank</v-icon>
      <p class="text-body-2 text-medium-emphasis mt-2">No hay excepciones configuradas</p>
    </v-card>

    <v-dialog v-model="showForm" max-width="400">
      <v-card>
        <v-card-title class="text-h6">Nueva Excepción</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="form.date"
            label="Fecha"
            type="date"
            class="mb-2"
          />
          <v-switch
            v-model="form.is_closed"
            label="Cerrado todo el día"
            color="error"
            class="mb-2"
          />
          <template v-if="!form.is_closed">
            <v-row>
              <v-col cols="12" sm="6">
                <v-text-field v-model="form.start_time" label="Hora inicio" type="time" />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field v-model="form.end_time" label="Hora fin" type="time" />
              </v-col>
            </v-row>
          </template>
          <v-text-field v-model="form.reason" label="Motivo (opcional)" />
        </v-card-text>
        <v-card-actions class="pa-4 pt-0">
          <v-spacer />
          <v-btn variant="text" @click="showForm = false">Cancelar</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :loading="loading"
            @click="onCreate"
          >
            Crear
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
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
</script>
