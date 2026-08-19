<template>
  <div>
    <PageHeader
      title="Eventos"
      subtitle="Administra los eventos del negocio: fechas, cupos y ventana de reserva"
    >
      <template #actions>
        <v-btn color="primary" @click="openCreate">
          <v-icon start>mdi-plus</v-icon>
          Nuevo Evento
        </v-btn>
      </template>
    </PageHeader>

    <v-container class="py-4">
      <v-row v-if="eventStore.events.length > 0" class="mb-4">
        <v-col cols="12" sm="6" md="4">
          <v-text-field
            v-model="searchQuery"
            label="Buscar evento"
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
            density="compact"
            hide-details
            clearable
          />
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <v-select
            v-model="filterActive"
            :items="[
              { title: 'Todos', value: null },
              { title: 'Activos', value: true },
              { title: 'Inactivos', value: false },
            ]"
            item-title="title"
            item-value="value"
            label="Estado"
            variant="outlined"
            density="compact"
            hide-details
          />
        </v-col>
      </v-row>
      <div v-if="eventStore.loading" class="text-center pa-8">
        <v-progress-circular indeterminate color="primary" />
      </div>

      <div
        v-else-if="eventStore.events.length === 0"
        class="text-center pa-8"
      >
        <v-icon size="64" color="medium-emphasis">mdi-calendar-star</v-icon>
        <p class="text-body-1 text-medium-emphasis mt-4">No hay eventos configurados</p>
        <v-btn
          color="primary"
          variant="flat"
          class="mt-4"
          @click="openCreate"
        >
          Crear Primer Evento
        </v-btn>
      </div>

      <v-row v-else>
        <v-col
          v-for="ev in filteredEvents"
          :key="ev.id"
          cols="12"
          sm="6"
          md="4"
          lg="3"
        >
          <v-card
            class="rounded-xl h-100"
            :variant="ev.is_active ? 'outlined' : 'tonal'"
            @click="openDetail(ev)"
          >
            <v-card-text class="pa-4">
              <div class="d-flex align-center ga-2 mb-2">
                <v-icon :color="ev.is_active ? 'primary' : 'medium-emphasis'">
                  mdi-calendar-star
                </v-icon>
                <span class="text-subtitle-1 font-weight-bold text-truncate">{{ ev.name }}</span>
              </div>
              <div class="text-body-2 text-medium-emphasis mb-1">
                <v-icon size="16">mdi-calendar</v-icon>
                {{ formatDate(ev.event_date) }}
              </div>
              <div class="text-body-2 text-medium-emphasis mb-1">
                <v-icon size="16">mdi-clock-outline</v-icon>
                {{ ev.start_time.slice(0, 5) }} - {{ ev.end_time.slice(0, 5) }}
              </div>
              <div class="text-body-2 text-medium-emphasis mb-2">
                <v-icon size="16">mdi-account-group</v-icon>
                {{ ev.max_participants ? `Cupo: ${ev.max_participants}` : 'Cupo ilimitado' }}
              </div>
              <template v-if="capacityBy(ev)">
                <v-progress-linear
                  :model-value="capacityPercent(ev)"
                  :color="capacityPercent(ev) >= 100 ? 'error' : capacityPercent(ev) >= 75 ? 'warning' : 'primary'"
                  height="6"
                  rounded
                />
                <div class="text-caption text-medium-emphasis mt-1">
                  {{ capacityBy(ev)!.total_participants }}/{{
                    ev.max_participants ?? '∞'
                  }}
                  {{ ev.max_participants ? `· ${capacityBy(ev)!.spots_left} libres` : '' }}
                </div>
              </template>
              <v-chip
                v-if="!ev.is_active"
                size="small"
                color="warning"
                variant="tonal"
              >
                Inactivo
              </v-chip>
              <v-chip
                v-else
                size="small"
                color="success"
                variant="tonal"
              >
                Activo
              </v-chip>
              <v-card-actions class="pa-0 mt-3">
                <v-btn variant="tonal" size="small" @click.stop="openEdit(ev)">
                  <v-icon start size="16">mdi-pencil</v-icon>
                  Editar
                </v-btn>
                <v-btn
                  variant="text"
                  size="small"
                  color="error"
                  @click.stop="onDelete(ev)"
                >
                  <v-icon start size="16">mdi-delete</v-icon>
                  Eliminar
                </v-btn>
              </v-card-actions>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>

    <EventForm
      :visible="showForm"
      :event="editingEvent"
      @close="closeForm"
      @save="onSave"
    />

    <EventDetailDrawer
      :visible="showDetail"
      :event="selectedEvent"
      @close="closeDetail"
      @edit="openEdit"
      @refresh="refreshCapacity"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import PageHeader from '@/shared/components/PageHeader.vue';
import { useNotification } from '@/shared/composables/useNotification';
import { useConfirm } from '@/shared/composables/useConfirm';
import { useEventStore } from '../stores/event.store';
import { useEventRegistrationStore } from '../stores/eventRegistration.store';
import EventForm from '../components/EventForm.vue';
import EventDetailDrawer from '../components/EventDetailDrawer.vue';
import type { Event, CreateEventDTO, EventRegCapacity } from '../types/event.types';

const eventStore = useEventStore();
const registrationStore = useEventRegistrationStore();
const notification = useNotification();
const { confirm } = useConfirm();

const showForm = ref(false);
const editingEvent = ref<Event | null>(null);
const showDetail = ref(false);
const selectedEvent = ref<Event | null>(null);

const filteredEvents = computed(() => {
  let list = eventStore.events;
  if (filterActive.value === true) list = list.filter((e) => e.is_active);
  if (filterActive.value === false) list = list.filter((e) => !e.is_active);
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase();
    list = list.filter((e) => e.name.toLowerCase().includes(q) || (e.category_name ?? '').toLowerCase().includes(q));
  }
  return list;
});

function capacityBy(event: Event): EventRegCapacity | null {
  return registrationStore.capacityByEvent[event.id] ?? null;
}

function capacityPercent(event: Event): number {
  const cap = capacityBy(event);
  if (!cap?.max_participants) return 0;
  return Math.min(100, Math.round((cap.total_participants / cap.max_participants) * 100));
}

function formatDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('es', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

onMounted(() => {
  eventStore.fetchEvents();
});

watch(
  () => eventStore.events,
  (events) => {
    registrationStore.fetchCapacityByEvents(events);
  },
  { immediate: true },
);

watch(
  () => registrationStore.capacity,
  () => {
    if (eventStore.events.length > 0) {
      registrationStore.fetchCapacityByEvents(eventStore.events);
    }
  },
);

function openCreate() {
  editingEvent.value = null;
  showForm.value = true;
}

function openEdit(event: Event) {
  editingEvent.value = event;
  showForm.value = true;
  showDetail.value = false;
}

function openDetail(event: Event) {
  selectedEvent.value = event;
  showDetail.value = true;
}

function closeDetail() {
  showDetail.value = false;
  selectedEvent.value = null;
  refreshCapacity();
}

function refreshCapacity() {
  if (eventStore.events.length > 0) {
    registrationStore.fetchCapacityByEvents(eventStore.events);
  }
}

const searchQuery = ref('');
const filterActive = ref<boolean | null>(null);

function closeForm() {
  showForm.value = false;
  editingEvent.value = null;
}

async function onSave(dto: CreateEventDTO) {
  try {
    if (editingEvent.value) {
      await eventStore.updateEvent(editingEvent.value.id, dto);
      notification.success('Evento actualizado');
    } else {
      await eventStore.createEvent(dto);
      notification.success('Evento creado');
    }
    closeForm();
  } catch {
    notification.error('Error al guardar evento');
  }
}

async function onDelete(event: Event) {
  const ok = await confirm(`¿Eliminar el evento "${event.name}"?`);
  if (!ok) return;
  try {
    await eventStore.deleteEvent(event.id);
    notification.success('Evento eliminado');
  } catch {
    notification.error('Error al eliminar evento');
  }
}
</script>