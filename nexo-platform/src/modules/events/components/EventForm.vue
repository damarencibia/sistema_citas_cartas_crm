<template>
  <v-dialog
    :model-value="visible"
    max-width="560"
    persistent
    :fullscreen="$vuetify.display.smAndDown"
    @update:model-value="emit('close')"
  >
    <v-card>
      <v-card-title class="text-h6 d-flex align-center">
        {{ editing ? 'Editar Evento' : 'Nuevo Evento' }}
        <v-spacer />
        <v-btn
          icon="mdi-close"
          size="small"
          variant="text"
          @click="emit('close')"
        />
      </v-card-title>
      <v-card-text>
        <v-form ref="formRef" @submit.prevent="onSubmit">
          <v-text-field
            v-model="localForm.name"
            label="Nombre del evento"
            :rules="[(v) => !!v || 'Requerido']"
          />
          <v-textarea
            v-model="localForm.description"
            label="Descripción (opcional)"
            rows="2"
          />
          <v-select
            v-model="localForm.category_id"
            :items="categoryOptions"
            item-title="text"
            item-value="value"
            label="Categoría"
            clearable
          />
          <v-row>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="localForm.event_date"
                label="Fecha del evento"
                type="date"
                :rules="[(v) => !!v || 'Requerido']"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model.number="localForm.max_participants"
                label="Capacidad (cupo)"
                type="number"
                :min="1"
                :rules="[(v) => (v === '' || v === null || v === undefined || v >= 1) || 'Mínimo 1']"
                hint="Vacío = cupo ilimitado"
                persistent-hint
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="localForm.start_time"
                label="Hora de inicio"
                type="time"
                :rules="[(v) => !!v || 'Requerido']"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="localForm.end_time"
                label="Hora fin"
                type="time"
                :rules="[() => !localForm.start_time || !localForm.end_time || localForm.end_time > localForm.start_time || 'Debe ser posterior a la hora de inicio']"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="localForm.reservation_open_date"
                label="Apertura de reservas"
                type="date"
                hint="Desde cuándo se pueden reservar (hoy si se deja vacío)"
                persistent-hint
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-select
                v-model.number="localForm.reservation_close_offset_minutes"
                :items="closeOffsetOptions"
                label="Cerrar reservas"
                hint="Margen antes del inicio del evento"
                persistent-hint
              />
            </v-col>
          </v-row>
          <v-switch
            v-model="localForm.is_active"
            label="Evento activo"
            color="primary"
            hide-details
            class="mt-2"
          />
        </v-form>
      </v-card-text>
      <v-card-actions class="pa-4 pt-0">
        <v-spacer />
        <v-btn variant="text" @click="emit('close')">Cancelar</v-btn>
        <v-btn
          color="primary"
          variant="flat"
          :loading="submitting"
          @click="onSubmit"
        >
          {{ editing ? 'Guardar' : 'Crear' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue';
import { useServiceCategoryStore } from '@/modules/appointments/stores/service-category.store';
import type { Event, CreateEventDTO } from '../types/event.types';

const props = defineProps<{
  visible: boolean;
  event?: Event | null;
}>();

const emit = defineEmits<{
  close: [];
  save: [dto: CreateEventDTO];
}>();

const categoryStore = useServiceCategoryStore();

const editing = ref(false);
const submitting = ref(false);
const formRef = ref();

const closeOffsetOptions = [
  { value: 0, title: 'Al inicio del evento' },
  { value: 15, title: '15 minutos antes' },
  { value: 30, title: '30 minutos antes' },
  { value: 60, title: '1 hora antes' },
  { value: 120, title: '2 horas antes' },
  { value: 360, title: '6 horas antes' },
  { value: 720, title: '12 horas antes' },
  { value: 1440, title: '1 día antes' },
];

const localForm = reactive<CreateEventDTO>({
  name: '',
  description: '',
  category_id: null,
  max_participants: null,
  event_date: new Date().toISOString().split('T')[0],
  start_time: '',
  end_time: '',
  reservation_open_date: null,
  reservation_close_offset_minutes: 60,
  is_active: true,
});

const categoryOptions = computed(() =>
  categoryStore.activeCategories.map((c) => ({
    value: c.id,
    text: c.name,
  })),
);

watch(
  () => props.event,
  (ev) => {
    if (ev) {
      editing.value = true;
      localForm.name = ev.name;
      localForm.description = ev.description ?? '';
      localForm.category_id = ev.category_id;
      localForm.max_participants = ev.max_participants;
      localForm.event_date = ev.event_date;
      localForm.start_time = ev.start_time;
      localForm.end_time = ev.end_time;
      localForm.reservation_open_date = ev.reservation_open_date;
      localForm.reservation_close_offset_minutes = ev.reservation_close_offset_minutes ?? 60;
      localForm.is_active = ev.is_active;
    } else {
      editing.value = false;
      localForm.name = '';
      localForm.description = '';
      localForm.category_id = null;
      localForm.max_participants = null;
      localForm.event_date = new Date().toISOString().split('T')[0];
      localForm.start_time = '';
      localForm.end_time = '';
      localForm.reservation_open_date = null;
      localForm.reservation_close_offset_minutes = 60;
      localForm.is_active = true;
    }
  },
  { immediate: true },
);

onMounted(() => {
  if (!categoryStore.categories.length) categoryStore.fetchCategories();
});

async function onSubmit() {
  const { valid } = await formRef.value.validate();
  if (!valid) return;
  if (localForm.end_time && localForm.start_time && localForm.end_time <= localForm.start_time) {
    formRef.value.validate();
    return;
  }
  submitting.value = true;
  const payload: CreateEventDTO = { ...localForm };
  const cap = payload.max_participants;
  if (cap == null || (typeof cap === 'string' && cap === '')) {
    payload.max_participants = null;
  }
  emit('save', payload);
}
</script>