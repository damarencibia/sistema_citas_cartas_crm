<template>
  <v-navigation-drawer
    :model-value="visible"
    temporary
    location="right"
    :width="smAndDown ? '100%' : 600"
    :scrim="smAndDown ? false : true"
    class="event-detail-drawer"
    @update:model-value="(v) => !v && emit('close')"
  >
    <template v-if="event">
      <div class="event-detail__shell d-flex flex-column">
        <div class="event-detail__headerbar d-flex align-center flex-shrink-0">
          <v-tabs
            v-model="detailTab"
            density="compact"
            color="primary"
            class="flex-grow-1"
          >
            <v-tab value="detail">Detalle del evento</v-tab>
            <v-tab value="attendees">
              Asistentes
              <v-chip
                v-if="confirmedCount > 0"
                size="x-small"
                variant="tonal"
                color="primary"
                class="ml-1"
              >
                {{ confirmedCount }}
              </v-chip>
            </v-tab>
          </v-tabs>
          <v-btn
            icon="mdi-close"
            size="small"
            variant="text"
            aria-label="Cerrar detalle"
            class="mr-1"
            @click="emit('close')"
          />
        </div>

        <template v-if="detailTab === 'detail'">
          <div class="pa-4 overflow-y-auto flex-grow-1">
            <v-card variant="tonal" class="rounded-xl mb-4">
              <v-card-text>
                <div class="d-flex align-center ga-2 mb-2">
                  <v-icon color="primary">mdi-calendar-star</v-icon>
                  <span class="text-h6 font-weight-bold">{{ event.name }}</span>
                  <v-spacer />
                  <v-chip
                    :color="event.is_active ? 'success' : 'warning'"
                    size="small"
                    variant="tonal"
                  >
                    {{ event.is_active ? 'Activo' : 'Inactivo' }}
                  </v-chip>
                </div>
                <div class="text-body-2 mb-1">
                  <v-icon size="16">mdi-calendar</v-icon>
                  {{ formatDate(event.event_date) }}
                </div>
                <div class="text-body-2 mb-1">
                  <v-icon size="16">mdi-clock-outline</v-icon>
                  {{ event.start_time.slice(0, 5) }} - {{ event.end_time.slice(0, 5) }}
                </div>
                <div v-if="event.category_name" class="text-body-2 mb-1">
                  <v-icon size="16">mdi-tag-outline</v-icon>
                  {{ event.category_name }}
                </div>
                <p v-if="event.description" class="text-body-2 text-medium-emphasis mt-2">
                  {{ event.description }}
                </p>
              </v-card-text>
              <v-card-actions class="pa-4 pt-0">
                <v-btn variant="tonal" size="small" @click="emit('edit', event)">
                  <v-icon start size="16">mdi-pencil</v-icon>
                  Editar evento
                </v-btn>
              </v-card-actions>
            </v-card>

            <v-card variant="tonal" class="rounded-xl mb-4">
              <v-card-text>
                <div class="d-flex align-center justify-space-between mb-1">
                  <span class="text-subtitle-2 font-weight-bold">Capacidad</span>
                  <span class="text-body-2 text-medium-emphasis">
                    {{
                      capacity?.max_participants == null
                        ? 'Ilimitado'
                        : `${capacity.total_participants} / ${capacity.max_participants}`
                    }}
                  </span>
                </div>
                <template v-if="capacity?.max_participants != null">
                  <v-progress-linear
                    :model-value="capacityPercent"
                    :color="capacityPercent >= 100 ? 'error' : capacityPercent >= 75 ? 'warning' : 'primary'"
                    height="10"
                    rounded
                  />
                  <div class="text-caption text-medium-emphasis mt-1">
                    {{ capacity.spots_left }} cupos disponibles
                  </div>
                </template>
                <template v-else>
                  <v-progress-linear
                    model-value="0"
                    height="10"
                    rounded
                    color="grey-lighten-2"
                  />
                </template>
                <div class="d-flex ga-2 mt-3">
                  <v-chip color="success" size="small" variant="tonal">
                    {{ capacity?.confirmed_count ?? 0 }} confirmados
                  </v-chip>
                  <v-chip color="warning" size="small" variant="tonal">
                    {{ capacity?.waitlisted_count ?? 0 }} en espera
                  </v-chip>
                </div>
              </v-card-text>
            </v-card>

            <v-card v-if="event.reservation_open_date" variant="tonal" class="rounded-xl">
              <v-card-text class="text-body-2 text-medium-emphasis">
                <v-icon size="16">mdi-calendar-clock</v-icon>
                Reservas abren el {{ formatDate(event.reservation_open_date) }}
                <template v-if="event.reservation_close_offset_minutes != null">
                  · cierran {{ event.reservation_close_offset_minutes }} min antes
                </template>
              </v-card-text>
            </v-card>
          </div>
        </template>

        <template v-else>
          <div class="d-flex flex-column flex-grow-1 overflow-y-auto">
            <div class="d-flex align-center ga-2 pa-4 pb-2 flex-shrink-0">
              <v-btn-toggle
                v-model="statusFilter"
                density="compact"
                variant="tonal"
                color="primary"
                rounded="xl"
              >
                <v-btn value="all">Todos</v-btn>
                <v-btn value="confirmed">Confirmados</v-btn>
                <v-btn value="attended">Asistidos</v-btn>
                <v-btn value="waitlisted">En espera</v-btn>
                <v-btn value="cancelled">Cancelados</v-btn>
              </v-btn-toggle>
              <v-spacer />
              <v-btn
                v-if="attendedCount > 0"
                variant="text"
                size="small"
                color="info"
                @click="statusFilter = 'attended'"
              >
                {{ attendedCount }} asist.
              </v-btn>
            </div>

            <div v-if="registrationStore.loading" class="text-center pa-8">
              <v-progress-circular indeterminate color="primary" />
            </div>

            <div v-else-if="filteredRegistrations.length === 0" class="text-center pa-8">
              <v-icon size="48" color="medium-emphasis">mdi-account-group-outline</v-icon>
              <p class="text-body-1 text-medium-emphasis mt-3">Sin asistentes en esta vista</p>
            </div>

            <v-table v-else density="compact" class="flex-grow-1">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Contacto</th>
                  <th class="text-center">Personas</th>
                  <th>Estado</th>
                  <th class="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="reg in filteredRegistrations" :key="reg.id">
                  <td class="font-weight-medium">{{ reg.customer_name || '—' }}</td>
                  <td>
                    <div class="text-body-2">{{ reg.customer_email || '' }}</div>
                    <div class="text-caption text-medium-emphasis">{{ reg.customer_phone || '' }}</div>
                  </td>
                  <td class="text-center">{{ reg.participant_count }}</td>
                  <td>
                    <EventRegistrationStatusChip :status="reg.status" />
                  </td>
                  <td class="text-right">
                    <v-btn
                      v-if="reg.status === 'confirmed'"
                      variant="tonal"
                      size="x-small"
                      color="info"
                      title="Marcar como asistido"
                      @click="onMarkAttended(reg)"
                    >
                      <v-icon size="14">mdi-calendar-check</v-icon>
                    </v-btn>
                    <v-btn
                      v-if="reg.status === 'waitlisted'"
                      variant="tonal"
                      size="x-small"
                      color="success"
                      title="Convertir a confirmado"
                      @click="onPromote(reg)"
                    >
                      <v-icon size="14">mdi-check-circle</v-icon>
                    </v-btn>
                    <v-btn
                      v-if="reg.status !== 'cancelled' && reg.status !== 'attended'"
                      variant="text"
                      size="x-small"
                      color="error"
                      title="Cancelar registro"
                      @click="onCancel(reg)"
                    >
                      <v-icon size="14">mdi-close-circle</v-icon>
                    </v-btn>
                  </td>
                </tr>
              </tbody>
            </v-table>
          </div>
        </template>
      </div>
    </template>
  </v-navigation-drawer>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useDisplay } from 'vuetify';
import EventRegistrationStatusChip from './EventRegistrationStatusChip.vue';
import { useEventRegistrationStore } from '../stores/eventRegistration.store';
import { useConfirm } from '@/shared/composables/useConfirm';
import { useNotification } from '@/shared/composables/useNotification';
import type { Event, EventRegistration } from '../types/event.types';

const props = defineProps<{
  visible: boolean;
  event: Event | null;
}>();

const emit = defineEmits<{
  close: [];
  edit: [event: Event];
  refresh: [];
}>();

const { smAndDown } = useDisplay();
const registrationStore = useEventRegistrationStore();
const { confirm } = useConfirm();
const notification = useNotification();

const detailTab = ref<'detail' | 'attendees'>('detail');
const statusFilter = ref<'all' | EventRegistration['status']>('all');

const capacity = computed(() => registrationStore.capacity);
const capacityPercent = computed(() => {
  const max = capacity.value?.max_participants;
  if (!max) return 0;
  return Math.min(100, Math.round(((capacity.value?.total_participants ?? 0) / max) * 100));
});

const confirmedCount = computed(() => capacity.value?.confirmed_count ?? 0);
const attendedCount = computed(() => registrationStore.registrations.filter((r) => r.status === 'attended').length);

const filteredRegistrations = computed(() => {
  const all = registrationStore.registrations;
  if (statusFilter.value === 'all') return all;
  return all.filter((r) => r.status === statusFilter.value);
});

watch(
  () => props.visible,
  (open) => {
    if (open && props.event) {
      detailTab.value = 'detail';
      statusFilter.value = 'all';
      registrationStore.fetchRegistrations(props.event.id, props.event.max_participants);
    }
  },
);

watch(
  () => props.event?.id,
  (id) => {
    if (id && props.visible) {
      registrationStore.fetchRegistrations(id, props.event?.max_participants ?? null);
    }
  },
);

function formatDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('es', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

async function onMarkAttended(reg: EventRegistration) {
  try {
    await registrationStore.updateStatus(reg.id, 'attended');
    notification.success('Asistencia registrada');
    emit('refresh');
  } catch {
    notification.error('No se pudo actualizar el registro');
  }
}

async function onPromote(reg: EventRegistration) {
  try {
    await registrationStore.updateStatus(reg.id, 'confirmed');
    notification.success('Confirmado desde lista de espera');
    emit('refresh');
  } catch {
    notification.error('No se pudo actualizar el registro');
  }
}

async function onCancel(reg: EventRegistration) {
  const ok = await confirm(`¿Cancelar el registro de "${reg.customer_name || 'este asistente'}"?`);
  if (!ok) return;
  try {
    await registrationStore.cancelRegistration(reg.id);
    notification.success('Registro cancelado');
    emit('refresh');
  } catch {
    notification.error('No se pudo cancelar el registro');
  }
}
</script>

<style scoped>
.event-detail-drawer {
  position: fixed !important;
  top: 0 !important;
  right: 0 !important;
  height: 100vh !important;
  height: 100dvh !important;
  z-index: 1001 !important;
  transition-property: transform !important;
  transition-duration: 0.3s !important;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1) !important;
  will-change: transform;
  box-shadow: none !important;
  border-right: none !important;
  border-left: 1px solid rgb(var(--v-border)) !important;
}

.event-detail-drawer :deep(.v-navigation-drawer__content) {
  overflow: hidden;
}

.event-detail__shell {
  position: relative;
  height: 100dvh;
}

.event-detail__headerbar {
  border-bottom: 1px solid rgb(var(--v-border));
}
</style>