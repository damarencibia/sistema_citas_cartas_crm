<template>
  <div class="public-layout">
    <v-container class="py-8" max-width="700">
      <div v-if="loading" class="text-center pa-8">
        <v-progress-circular indeterminate color="primary" />
      </div>

      <v-card v-else-if="registration" class="rounded-xl pa-6" variant="outlined">
        <div class="text-center mb-4">
          <v-avatar color="primary" size="72">
            <v-icon size="40" color="white">mdi-calendar-star</v-icon>
          </v-avatar>
          <h1 class="text-h5 font-weight-bold mt-3">{{ registration.customer_name || 'Mi registro' }}</h1>
          <div class="mt-2">
            <EventRegistrationStatusChip
              :status="registration.status"
              size="medium"
            />
          </div>
        </div>

        <v-divider class="my-4" />

        <template v-if="event">
          <div class="d-flex align-center ga-2 mb-2">
            <v-icon color="primary">mdi-calendar-star</v-icon>
            <span class="text-subtitle-1 font-weight-bold">{{ event.name }}</span>
          </div>
          <div class="text-body-2 text-medium-emphasis mb-1">
            <v-icon size="16">mdi-calendar</v-icon>
            {{ formatDate(event.event_date) }}
          </div>
          <div class="text-body-2 text-medium-emphasis mb-1">
            <v-icon size="16">mdi-clock-outline</v-icon>
            {{ event.start_time.slice(0, 5) }} - {{ event.end_time.slice(0, 5) }}
          </div>
          <div class="text-body-2 text-medium-emphasis mb-1">
            <v-icon size="16">mdi-account-group</v-icon>
            {{ registration.participant_count }}
            {{ registration.participant_count === 1 ? 'persona' : 'personas' }}
          </div>
          <div v-if="registration.notes" class="text-body-2 text-medium-emphasis mt-1">
            <v-icon size="16">mdi-note-text-outline</v-icon>
            {{ registration.notes }}
          </div>
        </template>

        <v-alert
          v-if="registration.status === 'waitlisted'"
          type="warning"
          variant="tonal"
          class="mt-4"
          title="Estás en la lista de espera"
          text="Si se libera un cupo te notificaremos por WhatsApp."
        />
        <v-alert
          v-else-if="registration.status === 'cancelled'"
          type="error"
          variant="tonal"
          class="mt-4"
          title="Registro cancelado"
        />

        <div class="d-flex justify-center mt-5">
          <v-btn variant="text" :to="`/${route.params.slug}/events`">
            Volver a eventos
          </v-btn>
        </div>
      </v-card>

      <v-card v-else class="rounded-xl pa-8 text-center" variant="outlined">
        <v-icon size="64" color="medium-emphasis">mdi-magnify-close</v-icon>
        <p class="text-body-1 text-medium-emphasis mt-4">Registro no encontrado</p>
        <v-btn variant="text" class="mt-2" :to="`/${route.params.slug}/events`">
          Volver a eventos
        </v-btn>
      </v-card>
    </v-container>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useTenantStore } from '@/shared/stores/tenant.store';
import EventRegistrationStatusChip from '@/modules/events/components/EventRegistrationStatusChip.vue';
import { eventRegistrationRepository } from '@/modules/events/repositories/eventRegistration.repository';
import { eventRepository } from '@/modules/events/repositories/event.repository';
import type { EventRegistration, Event } from '@/modules/events/types/event.types';

const route = useRoute();
const tenantStore = useTenantStore();

const loading = ref(true);
const registration = ref<EventRegistration | null>(null);
const event = ref<Event | null>(null);

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
  try {
    if (tenantId) {
      const token = route.params.token as string;
      registration.value = await eventRegistrationRepository.getPublicByAccessToken(token, tenantId);
      if (registration.value) {
        const ev = await eventRepository.getById(registration.value.event_id);
        if (ev && ev.tenant_id === tenantId) {
          event.value = ev;
        }
      }
    }
  } finally {
    loading.value = false;
  }
});
</script>