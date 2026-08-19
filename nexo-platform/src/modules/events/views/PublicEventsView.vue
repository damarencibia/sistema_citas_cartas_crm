<template>
  <div class="public-layout">
    <v-container class="py-8" max-width="1000">
      <div class="text-center mb-6">
        <h1 class="text-h4 font-weight-bold">{{ tenantStore.tenant?.name || 'Eventos' }}</h1>
        <p v-if="events.length > 0" class="text-body-1 text-medium-emphasis">
          Próximos eventos y reservas
        </p>
      </div>

      <div v-if="loading" class="text-center pa-8">
        <v-progress-circular indeterminate color="primary" />
      </div>

      <div v-else-if="events.length === 0" class="text-center pa-8">
        <v-icon size="64" color="medium-emphasis">mdi-calendar-star</v-icon>
        <p class="text-body-1 text-medium-emphasis mt-4">No hay eventos próximos por ahora</p>
      </div>

      <v-row v-else>
        <v-col
          v-for="ev in events"
          :key="ev.id"
          cols="12"
          sm="6"
          md="4"
        >
          <v-card
            class="rounded-xl h-100"
            variant="outlined"
            :to="`/${route.params.slug}/events/${ev.id}`"
          >
            <v-card-text class="pa-4">
              <div class="d-flex align-center ga-2 mb-2">
                <v-icon color="primary">mdi-calendar-star</v-icon>
                <span class="text-subtitle-1 font-weight-bold text-truncate">{{ ev.name }}</span>
                <v-spacer />
                <v-chip
                  v-if="isFull(ev)"
                  size="x-small"
                  color="error"
                  variant="tonal"
                >
                  Lleno
                </v-chip>
              </div>
              <div class="text-body-2 text-medium-emphasis mb-1">
                <v-icon size="16">mdi-calendar</v-icon>
                {{ formatDate(ev.event_date) }}
              </div>
              <div class="text-body-2 text-medium-emphasis mb-1">
                <v-icon size="16">mdi-clock-outline</v-icon>
                {{ ev.start_time.slice(0, 5) }} - {{ ev.end_time.slice(0, 5) }}
              </div>
              <div v-if="ev.category_name" class="text-body-2 text-medium-emphasis mb-2">
                <v-icon size="16">mdi-tag-outline</v-icon>
                {{ ev.category_name }}
              </div>
              <template v-if="cap(ev)">
                <v-progress-linear
                  :model-value="capPercent(ev)"
                  :color="capPercent(ev) >= 100 ? 'error' : 'primary'"
                  height="6"
                  rounded
                />
                <div class="text-caption text-medium-emphasis mt-1">
                  {{ cap(ev)!.total_participants }}/{{
                    ev.max_participants ?? '∞'
                  }}
                  <template v-if="ev.max_participants">
                    · {{ cap(ev)!.spots_left }} cupos libres
                  </template>
                </div>
              </template>
              <v-btn
                color="primary"
                variant="flat"
                size="small"
                class="mt-3"
              >
                Reservar
              </v-btn>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useTenantStore } from '@/shared/stores/tenant.store';
import { eventRepository } from '../repositories/event.repository';
import { eventRegistrationRepository } from '../repositories/eventRegistration.repository';
import type { Event, EventRegCapacity } from '../types/event.types';

const route = useRoute();
const tenantStore = useTenantStore();

const events = ref<Event[]>([]);
const capacities = ref<Record<string, EventRegCapacity>>({});
const loading = ref(true);

function cap(event: Event): EventRegCapacity | null {
  return capacities.value[event.id] ?? null;
}

function capPercent(event: Event): number {
  const c = cap(event);
  if (!c?.max_participants) return 0;
  return Math.min(100, Math.round((c.total_participants / c.max_participants) * 100));
}

function isFull(event: Event): boolean {
  const c = cap(event);
  return c?.max_participants != null && c.spots_left === 0;
}

function formatDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('es', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

onMounted(async () => {
  const slug = route.params.slug as string;
  await tenantStore.fetchTenantBySlug(slug);
  const tenantId = tenantStore.tenant?.id;
  if (!tenantId) {
    loading.value = false;
    return;
  }
  try {
    events.value = await eventRepository.getPublicByTenant(tenantId);
    if (events.value.length > 0) {
      const maxByEvent = new Map(events.value.map((e) => [e.id, e.max_participants]));
      capacities.value = await eventRegistrationRepository.getCountsByEventIds(
        events.value.map((e) => e.id),
        maxByEvent,
      );
    }
  } catch {
    // stay with empty array — empty state will show
  } finally {
    loading.value = false;
  }
});
</script>