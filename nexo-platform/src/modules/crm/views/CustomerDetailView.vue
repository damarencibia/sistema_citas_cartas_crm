<template>
  <div>
    <!-- Skeleton de carga -->
    <template v-if="loading">
      <PageHeader title="Cliente" subtitle="Perfil completo del cliente" always-show-title />
      <v-row class="pa-4">
        <v-col cols="12" md="4">
          <v-skeleton-loader type="card-avatar, article" />
        </v-col>
        <v-col cols="12" md="8">
          <v-skeleton-loader type="article, table" />
        </v-col>
      </v-row>
    </template>

    <template v-else>
      <!-- Error / no encontrado -->
      <EmptyState
        v-if="!customer"
        icon="mdi-account-question-outline"
        title="Cliente no encontrado"
        description="Puede haber sido eliminado o no pertenece a tu negocio"
      >
        <template #actions>
          <v-btn variant="tonal" prepend-icon="mdi-arrow-left" @click="router.push('/crm/customers')">
            Volver a Clientes
          </v-btn>
        </template>
      </EmptyState>

      <template v-else>
        <PageHeader :title="fullName" subtitle="Perfil del cliente" always-show-title>
          <template #actions>
            <v-btn
              variant="text"
              prepend-icon="mdi-arrow-left"
              @click="router.push('/crm/customers')"
            >
              Volver
            </v-btn>
            <v-btn color="primary" @click="showEdit = true">
              <v-icon start>mdi-pencil-outline</v-icon>
              Editar
            </v-btn>
          </template>
        </PageHeader>

        <v-container fluid class="py-4">
          <v-row>
            <!-- Columna de perfil -->
            <v-col cols="12" md="4">
              <v-card class="pa-6 text-center">
                <v-avatar
                  size="80"
                  color="primary"
                  variant="tonal"
                  class="mb-3"
                >
                  <span class="text-h5 font-weight-bold">{{ initials }}</span>
                </v-avatar>
                <h2 class="text-h6 font-weight-bold">{{ fullName }}</h2>
                <div class="text-body-2 text-medium-emphasis mt-1">
                  <template v-if="customer.phone">
                    <v-icon size="14" class="mr-1">mdi-phone-outline</v-icon>{{ customer.phone }}
                  </template>
                  <template v-if="customer.email">
                    <div class="mt-1">
                      <v-icon size="14" class="mr-1">mdi-email-outline</v-icon>{{ customer.email }}
                    </div>
                  </template>
                </div>
                <div v-if="customer.last_visit_at" class="text-caption text-medium-emphasis mt-2">
                  <v-icon size="12">mdi-history</v-icon>
                  Última visita: {{ formatRelative(customer.last_visit_at) }}
                </div>

                <v-divider class="my-4" />

                <div class="d-flex justify-space-around">
                  <div class="text-center">
                    <p class="text-h6 font-weight-bold">{{ customer.total_visits ?? 0 }}</p>
                    <p class="text-caption text-medium-emphasis">Visitas</p>
                  </div>
                  <v-divider vertical />
                  <div class="text-center">
                    <p class="text-h6 font-weight-bold">{{ formatCurrency(customer.total_spent ?? 0) }}</p>
                    <p class="text-caption text-medium-emphasis">Gastado</p>
                  </div>
                  <v-divider vertical />
                  <div class="text-center">
                    <p
                      class="text-h6 font-weight-bold"
                      :class="loyaltyBalance > 0 ? 'text-success' : ''"
                    >
                      {{ loyaltyBalance.toLocaleString('es') }}
                    </p>
                    <p class="text-caption text-medium-emphasis">Puntos</p>
                  </div>
                </div>

                <v-divider class="my-4" />

                <v-textarea
                  v-model="notesDraft"
                  label="Notas internas"
                  variant="outlined"
                  density="compact"
                  rows="3"
                  auto-grow
                  hide-details
                  placeholder="Preferencias, alergias, historial relevante…"
                >
                  <template #append-inner>
                    <v-btn
                      v-if="notesDraft !== (customer.notes ?? '')"
                      size="x-small"
                      variant="tonal"
                      color="primary"
                      :loading="savingNotes"
                      @click="saveNotes"
                    >
                      <v-icon size="14">mdi-content-save</v-icon>
                    </v-btn>
                  </template>
                </v-textarea>
              </v-card>
            </v-col>

            <!-- Columna de historial -->
            <v-col cols="12" md="8">
              <v-card class="pa-2">
                <v-card-text class="pb-0">
                  <v-tabs v-model="activeTab" color="primary">
                    <v-tab value="bookings">
                      <v-icon start size="16">mdi-calendar-check</v-icon>
                      Citas ({{ timelineBookings.length }})
                    </v-tab>
                    <v-tab value="points">
                      <v-icon start size="16">mdi-star-four-points</v-icon>
                      Puntos ({{ timelinePoints.length }})
                    </v-tab>
                  </v-tabs>
                </v-card-text>
                <v-divider />

                <v-card-text class="pa-0">
                  <v-window v-model="activeTab">
                    <!-- Citas -->
                    <v-window-item value="bookings">
                      <EmptyState
                        v-if="timelineBookings.length === 0"
                        icon="mdi-calendar-blank"
                        title="Sin citas registradas"
                        description="Las citas del cliente aparecerán aquí"
                      />
                      <v-list v-else density="compact" class="py-0">
                        <template v-for="(booking, i) in timelineBookings" :key="booking.id">
                          <v-list-item class="px-4 py-3">
                            <div class="d-flex align-start ga-3 w-100">
                              <v-icon size="20" color="primary">mdi-calendar-check</v-icon>
                              <div class="flex-grow-1" style="min-width: 0;">
                                <div class="text-body-2 font-weight-medium">
                                  {{ booking.service_name }}
                                </div>
                                <div class="text-caption text-medium-emphasis">
                                  {{ formatDate(`${booking.date}T${booking.start_time.slice(0, 5)}`, "EEEE d 'de' MMMM, yyyy · HH:mm") }}
                                </div>
                              </div>
                              <StatusBadge :status="booking.status" />
                            </div>
                          </v-list-item>
                          <v-divider v-if="i < timelineBookings.length - 1" />
                        </template>
                      </v-list>
                    </v-window-item>

                    <!-- Puntos -->
                    <v-window-item value="points">
                      <EmptyState
                        v-if="timelinePoints.length === 0"
                        icon="mdi-star-outline"
                        title="Sin puntos asignados"
                        description="Los puntos de fidelización aparecerán aquí"
                      />
                      <v-list v-else density="compact" class="py-0">
                        <template v-for="(point, i) in timelinePoints" :key="point.id">
                          <v-list-item class="px-4 py-3">
                            <div class="d-flex align-start ga-3 w-100">
                              <v-icon
                                size="20"
                                :color="point.points > 0 ? 'success' : 'error'"
                              >
                                {{ point.points > 0 ? 'mdi-arrow-up-bold-circle' : 'mdi-arrow-down-bold-circle' }}
                              </v-icon>
                              <div class="flex-grow-1" style="min-width: 0;">
                                <div class="text-body-2 font-weight-medium">
                                  {{ point.reason }}
                                </div>
                                <div class="text-caption text-medium-emphasis">
                                  {{ formatDate(point.created_at, "dd/MM/yyyy") }}
                                  <template v-if="point.expires_at">
                                    · vence {{ formatDate(point.expires_at, 'dd/MM/yyyy') }}
                                  </template>
                                </div>
                              </div>
                              <span
                                class="text-body-2 font-weight-bold"
                                :class="point.points > 0 ? 'text-success' : 'text-error'"
                              >
                                {{ point.points > 0 ? '+' : '' }}{{ point.points }}
                              </span>
                            </div>
                          </v-list-item>
                          <v-divider v-if="i < timelinePoints.length - 1" />
                        </template>
                      </v-list>
                    </v-window-item>
                  </v-window>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </v-container>
      </template>
    </template>

    <CustomerForm
      :visible="showEdit"
      :customer="customer"
      :loading="saving"
      @close="showEdit = false"
      @save="onSave"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import PageHeader from '@/shared/components/PageHeader.vue';
import StatusBadge from '@/shared/components/StatusBadge.vue';
import EmptyState from '@/shared/components/EmptyState.vue';
import { useNotification } from '@/shared/composables/useNotification';
import { formatCurrency, formatDate, formatRelative } from '@/shared/utils/format';
import { customerRepository } from '../repositories/customer.repository';
import { useCustomerStore } from '../stores/customer.store';
import CustomerForm from '../components/CustomerForm.vue';
import type { CreateCustomerDTO, Customer, CustomerBooking, LoyaltyPoint } from '../types/customer.types';

const route = useRoute();
const router = useRouter();
const notification = useNotification();
const store = useCustomerStore();

const loading = ref(true);
const customer = ref<Customer | null>(null);
const timelineBookings = ref<CustomerBooking[]>([]);
const timelinePoints = ref<LoyaltyPoint[]>([]);
const loyaltyBalance = ref(0);
const notesDraft = ref('');
const savingNotes = ref(false);
const showEdit = ref(false);
const saving = ref(false);
const activeTab = ref('bookings');

const fullName = computed(
  () =>
    `${customer.value?.first_name ?? ''} ${customer.value?.last_name ?? ''}`.trim() ||
    'Cliente',
);

const initials = computed(() => {
  const f = customer.value?.first_name?.[0] ?? '';
  const l = customer.value?.last_name?.[0] ?? '';
  return `${f}${l}`.toUpperCase() || '?';
});

onMounted(async () => {
  const customerId = route.params.id as string;
  try {
    customer.value = await customerRepository.getById(customerId);
    if (customer.value) {
      notesDraft.value = customer.value.notes ?? '';
      const [bookings, points] = await Promise.all([
        customerRepository.getBookings(customerId),
        customerRepository.getLoyaltyPoints(customerId),
      ]);
      timelineBookings.value = bookings;
      timelinePoints.value = points;
      const now = new Date().toISOString();
      loyaltyBalance.value = points.reduce(
        (sum, p) => (!p.expires_at || p.expires_at > now ? sum + p.points : sum),
        0,
      );
    }
  } catch {
    notification.error('No se pudo cargar el cliente');
    customer.value = null;
  } finally {
    loading.value = false;
  }
});

async function saveNotes() {
  if (!customer.value) return;
  savingNotes.value = true;
  try {
    customer.value = await customerRepository.update(customer.value.id, {
      notes: notesDraft.value,
    });
    notification.success('Notas guardadas');
  } catch {
    notification.error('No se pudieron guardar las notas');
  } finally {
    savingNotes.value = false;
  }
}

async function onSave(dto: CreateCustomerDTO) {
  if (!customer.value) return;
  saving.value = true;
  try {
    customer.value = await customerRepository.update(customer.value.id, dto);
    const index = store.customers.findIndex((c) => c.id === customer.value!.id);
    if (index !== -1) store.customers[index] = customer.value;
    notification.success('Cliente actualizado');
    showEdit.value = false;
  } catch {
    notification.error('No se pudo guardar el cliente');
  } finally {
    saving.value = false;
  }
}
</script>
