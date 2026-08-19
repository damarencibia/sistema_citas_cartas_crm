<template>
  <div class="public-layout">
    <v-container class="py-8" max-width="800">
      <v-btn
        variant="text"
        size="small"
        class="mb-4"
        :to="`/${route.params.slug}/events`"
      >
        <v-icon start>mdi-arrow-left</v-icon>
        Volver a eventos
      </v-btn>

      <div v-if="loading" class="text-center pa-8">
        <v-progress-circular indeterminate color="primary" />
      </div>

      <div v-else-if="!event" class="text-center pa-8">
        <v-icon size="64" color="medium-emphasis">mdi-calendar-remove</v-icon>
        <p class="text-body-1 text-medium-emphasis mt-4">Evento no encontrado</p>
      </div>

      <template v-else-if="event">
        <v-card class="rounded-xl mb-6" variant="outlined">
          <v-card-text class="pa-6">
            <div class="d-flex align-center ga-2 mb-3">
              <v-icon color="primary" size="32">mdi-calendar-star</v-icon>
              <h1 class="text-h5 font-weight-bold">{{ event.name }}</h1>
            </div>
            <div class="text-body-1 mb-1">
              <v-icon size="18">mdi-calendar</v-icon>
              {{ formatDate(event.event_date) }}
            </div>
            <div class="text-body-1 mb-1">
              <v-icon size="18">mdi-clock-outline</v-icon>
              {{ event.start_time.slice(0, 5) }} - {{ event.end_time.slice(0, 5) }}
            </div>
            <div v-if="event.category_name" class="text-body-1 mb-1">
              <v-icon size="18">mdi-tag-outline</v-icon>
              {{ event.category_name }}
            </div>
            <p v-if="event.description" class="text-body-1 text-medium-emphasis mt-3">
              {{ event.description }}
            </p>

            <div class="mt-4">
              <div class="d-flex align-center justify-space-between mb-1">
                <span class="text-subtitle-2 font-weight-bold">Cupos</span>
                <span class="text-body-2 text-medium-emphasis">
                  {{
                    capacity?.max_participants == null
                      ? 'Ilimitado'
                      : `${capacity.total_participants} / ${capacity.max_participants}`
                  }}
                </span>
              </div>
              <v-progress-linear
                v-if="capacity?.max_participants != null"
                :model-value="capacityPercent"
                :color="capacityPercent >= 100 ? 'error' : 'primary'"
                height="10"
                rounded
              />
              <v-progress-linear
                v-else
                model-value="0"
                height="10"
                rounded
                color="grey-lighten-2"
              />
            </div>
          </v-card-text>
        </v-card>

        <v-alert
          v-if="isFull"
          type="warning"
          variant="tonal"
          class="mb-6"
          title="El evento está lleno"
          text="Puedes unirte a la lista de espera: si se libera un cupo te contactaremos."
        />

        <v-card v-if="!registered" class="rounded-xl" variant="outlined">
          <v-card-title class="text-subtitle-1 font-weight-bold pa-5 pb-0">
            Reservar lugar
          </v-card-title>
          <v-card-text>
            <v-alert
              v-if="!registrationOpen"
              type="info"
              variant="tonal"
              class="mb-4"
              :title="reservationClosedMessage"
            />
            <v-form ref="formRef" :disabled="!registrationOpen">
              <v-text-field
                v-model="form.customer_name"
                label="Nombre completo"
                :rules="[rules.required]"
                variant="outlined"
                density="comfortable"
                class="mb-3"
              />
              <v-text-field
                v-model="form.customer_email"
                label="Email"
                :rules="[rules.required, rules.email]"
                variant="outlined"
                density="comfortable"
                class="mb-3"
              />
              <v-text-field
                v-model="form.customer_phone"
                label="Teléfono"
                :rules="[rules.required, rules.phone]"
                variant="outlined"
                density="comfortable"
                class="mb-3"
              />
              <v-text-field
                v-model.number="form.participant_count"
                label="Número de personas"
                type="number"
                min="1"
                :max="maxParticipantsInput"
                :rules="[rules.required, rules.participants]"
                variant="outlined"
                density="comfortable"
                class="mb-3"
              />
              <v-textarea
                v-model="form.notes"
                label="Notas (opcional)"
                variant="outlined"
                density="comfortable"
                class="mb-3"
              />
              <v-checkbox
                v-model="form.whatsapp_consent"
                label="Acepto recibir confirmación y recordatorios por WhatsApp"
                color="primary"
              />
            </v-form>
            <v-btn
              color="primary"
              variant="flat"
              size="large"
              block
              :loading="submitting"
              @click="onSubmit"
            >
              Reservar lugar
            </v-btn>
          </v-card-text>
        </v-card>

        <v-card v-else class="rounded-xl" variant="outlined">
          <v-card-text class="text-center pa-8">
            <v-icon
              :color="registrationStatus === 'waitlisted' ? 'warning' : 'success'"
              size="64"
            >
              {{
                registrationStatus === 'waitlisted'
                  ? 'mdi-clock-alert-outline'
                  : 'mdi-check-circle-outline'
              }}
            </v-icon>
            <h2 class="text-h6 font-weight-bold mt-3">
              {{
                registrationStatus === 'waitlisted'
                  ? 'Estás en la lista de espera'
                  : '¡Registro confirmado!'
              }}
            </h2>
            <p class="text-body-1 text-medium-emphasis mt-2">
              {{
                registrationStatus === 'waitlisted'
                  ? 'Si se libera un cupo te notificaremos por WhatsApp.'
                  : `Te esperamos el ${formatDate(event.event_date)} a las ${event.start_time.slice(0, 5)}.`
              }}
            </p>
            <div class="d-flex flex-wrap justify-center ga-2 mt-5">
              <v-btn
                color="success"
                variant="flat"
                :href="waBusinessUrl"
                target="_blank"
              >
                <v-icon start>mdi-whatsapp</v-icon>
                Confirmar por WhatsApp
              </v-btn>
              <v-btn
                color="primary"
                variant="tonal"
                :href="waSelfLinkUrl"
                target="_blank"
              >
                <v-icon start>mdi-send</v-icon>
                Guardar mi enlace de registro
              </v-btn>
              <v-btn variant="text" :to="`/${route.params.slug}/events`">
                Volver a eventos
              </v-btn>
            </div>
          </v-card-text>
        </v-card>
      </template>
    </v-container>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue';
import { useRoute } from 'vue-router';
import { useTenantStore } from '@/shared/stores/tenant.store';
import { useNotification } from '@/shared/composables/useNotification';
import { eventRepository } from '../repositories/event.repository';
import { eventRegistrationRepository } from '../repositories/eventRegistration.repository';
import type { Event, EventRegCapacity, CreateEventRegistrationDTO } from '../types/event.types';

const route = useRoute();
const tenantStore = useTenantStore();
const notification = useNotification();

const event = ref<Event | null>(null);
const capacity = ref<EventRegCapacity | null>(null);
const loading = ref(true);

const formRef = ref<{ validate: () => Promise<{ valid: boolean }> } | null>(null);
const submitting = ref(false);
const registered = ref(false);
const registrationStatus = ref<'confirmed' | 'waitlisted'>('confirmed');
const registration = ref<{ access_token: string | null } | null>(null);

const form = reactive<CreateEventRegistrationDTO>({
  event_id: '',
  customer_name: null,
  customer_email: null,
  customer_phone: null,
  participant_count: 1,
  notes: null,
  whatsapp_consent: false,
});

const rules = {
  required: (v: unknown) => !!String(v ?? '').trim() || 'Campo requerido',
  email: (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'Email inválido',
  phone: (v: string) => /^\+?[\d\s\-()]{7,15}$/.test(v) || 'Teléfono inválido',
  participants: (v: number) => {
    if (!v || v < 1) return 'Al menos 1 persona';
    const max = maxParticipantsInput.value;
    if (max != null && v > max) return `Máximo ${max} personas`;
    return true;
  },
};

const capacityPercent = computed(() => {
  const c = capacity.value;
  if (!c?.max_participants) return 0;
  return Math.min(100, Math.round((c.total_participants / c.max_participants) * 100));
});

const isFull = computed(() => {
  const c = capacity.value;
  return c?.max_participants != null && c.spots_left === 0;
});

const maxParticipantsInput = computed(() => {
  const c = capacity.value;
  if (!c) return null;
  if (c.spots_left === null) return c.max_participants;
  return c.spots_left;
});

const registrationOpen = computed(() => {
  if (!event.value) return false;
  const today = new Date().toISOString().split('T')[0];
  if (event.value.reservation_open_date && event.value.reservation_open_date > today) return false;
  return true;
});

const reservationClosedMessage = computed(() => {
  if (!event.value) return '';
  if (!registrationOpen.value) return 'Las reservas aún no están abiertas.';
  return '';
});

function formatDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('es', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function normalizeDigits(phone: string | null): string | null {
  if (!phone) return null;
  return phone.replace(/\D/g, '') || null;
}

const waBusinessUrl = computed(() => {
  const digits = normalizeDigits(tenantStore.tenant?.phone ?? null);
  if (!digits || !event.value) return '';
  const text = [
    `Hola, confirmo mi registro para ${event.value.name}`,
    ` el ${formatDate(event.value.event_date)} a las ${event.value.start_time.slice(0, 5)}`,
    `. Soy ${form.customer_name ?? ''}`,
    form.participant_count && form.participant_count > 1
      ? `. Participantes: ${form.participant_count}`
      : '',
  ].join('');
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
});

const waSelfLinkUrl = computed(() => {
  const digits = normalizeDigits(form.customer_phone ?? null);
  if (!digits || !event.value || !registration.value?.access_token) return '';
  const link = `${window.location.origin}/${route.params.slug}/events/registration/${registration.value.access_token}`;
  const text = [
    `Tu registro para ${event.value.name}`,
    ` el ${formatDate(event.value.event_date)}`,
    ' fue guardado. Consulta aquí:',
    link,
  ].join('\n');
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
});

onMounted(async () => {
  const slug = route.params.slug as string;
  await tenantStore.fetchTenantBySlug(slug);
  const tenantId = tenantStore.tenant?.id;
  if (!tenantId) {
    loading.value = false;
    return;
  }
  try {
    const eventId = route.params.eventId as string;
    event.value = await eventRepository.getById(eventId);
    if (event.value && event.value.tenant_id !== tenantId) {
      event.value = null;
    }
    if (event.value) {
      form.event_id = event.value.id;
      capacity.value = await eventRegistrationRepository.getCapacityInfo(
        event.value.id,
        event.value.max_participants,
      );
    }
  } finally {
    loading.value = false;
  }
});

async function onSubmit() {
  const { valid } = await formRef.value!.validate();
  if (!valid) return;
  submitting.value = true;
  try {
    const created = await eventRegistrationRepository.create(
      form,
      tenantStore.tenant!.id,
      event.value!.max_participants,
      capacity.value?.total_participants ?? 0,
    );
    registration.value = created;
    registrationStatus.value = created.status === 'waitlisted' ? 'waitlisted' : 'confirmed';
    registered.value = true;
    capacity.value = await eventRegistrationRepository.getCapacityInfo(
      event.value!.id,
      event.value!.max_participants,
    );
  } catch {
    notification.error('Error al registrar. Inténtalo de nuevo.');
  } finally {
    submitting.value = false;
  }
}
</script>