<template>
  <v-navigation-drawer
    :model-value="visible"
    location="right"
    :temporary="true"
    width="460"
    class="customer-drawer"
    @update:model-value="emit('close')"
  >
    <template v-if="customer">
      <!-- Cabecera del cliente -->
      <div class="pa-4 d-flex align-start ga-3 border-b">
        <v-avatar color="primary" size="44" variant="tonal">
          <span class="font-weight-bold">{{ initials }}</span>
        </v-avatar>
        <div class="flex-grow-1" style="min-width: 0;">
          <div class="text-subtitle-1 font-weight-bold text-truncate">
            {{ fullName }}
          </div>
          <div class="text-caption text-medium-emphasis text-truncate">
            {{ customer.phone || 'Sin teléfono' }}
            <span v-if="customer.email"> · {{ customer.email }}</span>
          </div>
          <div v-if="customer.last_visit_at" class="text-caption mt-1">
            <v-icon size="12">mdi-history</v-icon>
            Última visita: {{ formatRelative(customer.last_visit_at) }}
          </div>
        </div>
        <v-btn
          icon
          variant="text"
          size="small"
          aria-label="Cerrar"
          @click="emit('close')"
        >
          <v-icon size="18">mdi-close</v-icon>
        </v-btn>
      </div>

      <!-- KPIs -->
      <div class="px-4 py-3 d-flex border-b">
        <div class="flex-grow-1 text-center">
          <div class="text-h6 font-weight-bold">{{ customer.total_visits ?? 0 }}</div>
          <div class="text-caption text-medium-emphasis">Visitas</div>
        </div>
        <v-divider vertical />
        <div class="flex-grow-1 text-center">
          <div class="text-h6 font-weight-bold">{{ formatCurrency(customer.total_spent ?? 0) }}</div>
          <div class="text-caption text-medium-emphasis">Gastado</div>
        </div>
        <v-divider vertical />
        <div class="flex-grow-1 text-center">
          <div class="text-h6 font-weight-bold" :class="loyaltyBalance > 0 ? 'text-success' : ''">
            {{ loyaltyBalance.toLocaleString('es') }}
          </div>
          <div class="text-caption text-medium-emphasis">Puntos</div>
        </div>
      </div>

      <v-divider />

      <v-card-text class="pa-0 overflow-y-auto" style="height: calc(100% - 240px);">
        <v-progress-linear v-if="loading" indeterminate color="primary" />

        <template v-else>
          <!-- Etiquetas -->
          <div class="pa-4 pb-2">
            <div class="text-overline text-medium-emphasis mb-2">Etiquetas</div>
            <v-select
              :model-value="selectedTagIds"
              :items="tagOptions"
              :item-title="'title'"
              :item-value="'value'"
              :loading="tagsLoading"
              label="Asignar etiquetas"
              variant="outlined"
              density="compact"
              hide-details
              clearable
              chips
              closable-chips
              multiple
              @update:model-value="onTagsChange"
            >
              <template #chip="{ props: chipProps, item }">
                <v-chip v-bind="chipProps" :style="tagChipStyleById(item.value as string)">
                  {{ item.title }}
                </v-chip>
              </template>
            </v-select>
          </div>

          <v-divider />

          <!-- Notas internas -->
          <div class="pa-4 pb-2">
            <div class="text-overline text-medium-emphasis mb-2">Notas internas</div>
            <v-textarea
              v-model="notesDraft"
              variant="outlined"
              density="compact"
              rows="3"
              auto-grow
              hide-details
              placeholder="Preferencias, alergias, historial relevante…"
            >
              <template #append-inner>
                <v-btn
                  v-if="notesDraft !== customer.notes"
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
          </div>

          <v-divider />

          <!-- Timeline unificada (citas + puntos) -->
          <div class="px-4 pb-4">
            <div class="text-overline text-medium-emphasis my-2">Historial</div>

            <EmptyState
              v-if="timelineFetched && timeline.length === 0"
              icon="mdi-history"
              title="Sin historial aún"
              description="Las citas y puntos aparecerán aquí"
            />

            <v-list v-else density="compact" class="py-0 timeline-list">
              <template v-for="(entry, i) in timeline" :key="entry.id">
                <v-list-item class="px-0 py-2">
                  <div class="d-flex align-start ga-3 w-100">
                    <v-icon
                      size="20"
                      :color="entry.type === 'points' ? 'success' : 'primary'"
                    >
                      {{ entry.type === 'points' ? 'mdi-star-four-points' : 'mdi-calendar-check' }}
                    </v-icon>
                    <div class="flex-grow-1 d-flex justify-space-between align-start ga-2" style="min-width: 0;">
                      <div style="min-width: 0;">
                        <div class="text-body-2 font-weight-medium text-truncate">
                          {{ entry.title }}
                        </div>
                        <div class="text-caption text-medium-emphasis">{{ entry.subtitle }}</div>
                      </div>
                      <v-chip
                        v-if="entry.status"
                        size="x-small"
                        variant="tonal"
                        label
                        class="flex-no-grow"
                      >
                        {{ bookingStatusLabel(entry.status) }}
                      </v-chip>
                    </div>
                    <div class="text-caption text-medium-emphasis text-no-wrap">
                      {{ formatDate(entry.date, 'dd MMM') }}
                    </div>
                  </div>
                </v-list-item>
                <v-divider v-if="i < timeline.length - 1" />
              </template>
            </v-list>
          </div>
        </template>
      </v-card-text>
    </template>
  </v-navigation-drawer>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import EmptyState from '@/shared/components/EmptyState.vue';
import { useNotification } from '@/shared/composables/useNotification';
import {
  formatCurrency,
  formatDate,
  formatRelative,
} from '@/shared/utils/format';
import { customerRepository } from '../repositories/customer.repository';
import { useCustomerStore } from '../stores/customer.store';
import type {
  Customer,
  CustomerBooking,
  LoyaltyPoint,
  TimelineEntry,
} from '../types/customer.types';

const props = defineProps<{
  visible: boolean;
  customer: Customer | null;
}>();

const emit = defineEmits<{
  close: [];
  updated: [customer: Customer];
}>();

const notification = useNotification();
const customerStore = useCustomerStore();

// ─── Estado del drawer ─────────────────────────────────────────
const loading = ref(false);
const savingNotes = ref(false);
const tagsLoading = ref(false);
const notesDraft = ref('');

const selectedTagIds = ref<string[]>([]);
const timeline = ref<TimelineEntry[]>([]);
const timelineFetched = ref(false);
const loyaltyBalance = ref(0);

const fullName = computed(() =>
  `${props.customer?.first_name ?? ''} ${props.customer?.last_name ?? ''}`.trim(),
);

const initials = computed(() => {
  const f = props.customer?.first_name?.[0] ?? '';
  const l = props.customer?.last_name?.[0] ?? '';
  return `${f}${l}`.toUpperCase() || '?';
});

const tagOptions = computed(() =>
  customerStore.tags.map((t) => ({ title: t.name, value: t.id })),
);

function tagChipStyleById(tagId: string): Record<string, string> {
  const tag = customerStore.tags.find((t) => t.id === tagId);
  if (!tag?.color) return {};
  return { backgroundColor: `${tag.color}22`, color: tag.color, borderColor: tag.color };
}

const bookingStatusLabels: Record<string, string> = {
  pending: 'Pendiente',
  approved: 'Aprobada',
  confirmed: 'Confirmada',
  in_progress: 'En curso',
  completed: 'Completada',
  cancelled: 'Cancelada',
  no_show: 'No asistió',
};

function bookingStatusLabel(status: string): string {
  return bookingStatusLabels[status] ?? status.replace(/_/g, ' ');
}

// ─── Carga de datos al abrir ──────────────────────────────────
watch(
  () => [props.visible, props.customer?.id] as const,
  async ([visible, id]) => {
    if (!visible || !props.customer) return;
    notesDraft.value = props.customer.notes ?? '';
    loyaltyBalance.value = 0;
    timeline.value = [];
    timelineFetched.value = false;
    loading.value = true;

    // Etiquetas del tenant (una sola vez por sesión) + asignadas al cliente
    selectedTagIds.value = [];
    if (customerStore.tags.length === 0) {
      tagsLoading.value = true;
      try {
        await customerStore.fetchTags();
      } finally {
        tagsLoading.value = false;
      }
    }
    try {
      selectedTagIds.value = await customerRepository.getCustomerTagIds(props.customer.id);
    } catch {
      notification.error('No se pudieron cargar las etiquetas del cliente');
    }

    // Timeline (citas + puntos de fidelización) en paralelo
    try {
      const [bookings, points] = await Promise.all([
        customerRepository.getBookings(id!),
        customerRepository.getLoyaltyPoints(id!),
      ]);
      timeline.value = mergeTimeline(bookings, points);
      loyaltyBalance.value = sumActivePoints(points);
    } catch {
      notification.error('No se pudo cargar el historial del cliente');
    } finally {
      loading.value = false;
      timelineFetched.value = true;
    }
  },
  { immediate: true },
);

function mergeTimeline(bookings: CustomerBooking[], points: LoyaltyPoint[]): TimelineEntry[] {
  const entries: TimelineEntry[] = [
    ...bookings.map((b) => ({
      id: `b-${b.id}`,
      type: 'booking' as const,
      date: `${b.date}T${b.start_time?.slice(0, 5) ?? '00:00'}`,
      title: b.service_name,
      subtitle: 'Cita',
      status: b.status,
    })),
    ...points.map((p) => ({
      id: `p-${p.id}`,
      type: 'points' as const,
      date: p.created_at,
      title: `${p.points > 0 ? '+' : ''}${p.points} pts`,
      subtitle: p.reason,
    })),
  ];
  return entries.sort((a, b) => (a.date < b.date ? 1 : -1));
}

function sumActivePoints(points: LoyaltyPoint[]): number {
  const now = new Date().toISOString();
  return points.reduce(
    (sum, p) => (!p.expires_at || p.expires_at > now ? sum + p.points : sum),
    0,
  );
}

// ─── Acciones ─────────────────────────────────────────────────
async function onTagsChange(tagIds: unknown): Promise<void> {
  if (!props.customer) return;
  const ids = Array.isArray(tagIds) ? (tagIds as string[]) : [];
  const previous = selectedTagIds.value;
  selectedTagIds.value = ids;
  try {
    await customerStore.setCustomerTags(props.customer.id, ids);
  } catch {
    selectedTagIds.value = previous;
    notification.error('No se pudieron guardar las etiquetas');
  }
}

async function saveNotes(): Promise<void> {
  if (!props.customer) return;
  savingNotes.value = true;
  try {
    const updated = await customerStore.updateCustomer(props.customer.id, {
      notes: notesDraft.value,
    });
    emit('updated', updated);
    notification.success('Notas guardadas');
  } catch {
    notification.error('No se pudieron guardar las notas');
  } finally {
    savingNotes.value = false;
  }
}
</script>

<style scoped>
.customer-drawer :deep(.v-navigation-drawer__content) {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}
</style>
