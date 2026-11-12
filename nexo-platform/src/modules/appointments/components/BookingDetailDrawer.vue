<template>
  <DetailDialog
    :visible="visible"
    title="Detalle de la cita"
    :meta="detailMeta"
    :width="640"
    @close="emit('close')"
  >
    <!-- Tabs: detalle / cola de espera (el close vive en el header del shell) -->
    <template #tabs>
      <v-tabs
        v-model="detailTab"
        density="compact"
        color="primary"
        class="booking-detail__tabs"
      >
        <v-tab value="detail">Detalle de la cita</v-tab>
        <v-tab value="queue">
          Cola de espera
          <v-chip
            v-if="queueCount > 0"
            size="x-small"
            variant="tonal"
            color="primary"
            class="ml-2"
          >
            {{ queueCount }}
          </v-chip>
        </v-tab>
      </v-tabs>
    </template>

    <div v-if="booking" class="booking-detail__scroll">
      <BookingDetailInfo
        v-if="detailTab === 'detail'"
        :booking="booking"
        :show-actions="showActions"
        @cancel-turn="(d) => emit('cancelTurn', d)"
      />

      <BookingWaitlistTab
        v-else-if="detailTab === 'queue'"
        :booking="booking"
        :waitlist-entries="waitlistEntries"
        :tenant-name="tenantName"
        @waitlist-remove="(e) => emit('waitlistRemove', e)"
      />
    </div>
  </DetailDialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import DetailDialog from './DetailDialog.vue';
import BookingDetailInfo from './BookingDetailInfo.vue';
import BookingWaitlistTab from './BookingWaitlistTab.vue';
import { formatDate } from '@/shared/utils/format';
import type { Booking, WaitlistEntry } from '../types/booking.types';

const props = defineProps<{
  visible: boolean;
  booking: Booking | null;
  showActions?: boolean;
  waitlistEntries?: WaitlistEntry[];
  tenantName?: string;
}>();

const emit = defineEmits<{
  close: [];
  cancelTurn: [data: { keepBlocked: boolean; reason: string }];
  waitlistRemove: [entry: WaitlistEntry];
}>();

const detailTab = ref<'detail' | 'queue'>('detail');

const queueCount = computed(() => props.waitlistEntries?.length ?? 0);

/** Meta editorial: fecha · hora */
const detailMeta = computed(() => {
  if (!props.booking) return '';
  const time = props.booking.start_time?.slice(0, 5) ?? '';
  return [props.booking.date ? formatDate(props.booking.date) : '', time]
    .filter(Boolean)
    .join(' · ');
});
</script>

<style scoped>
.booking-detail__tabs :deep(.v-tab) {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

/* El shell no scrollea: el contenido del detalle define su propio scroll */
.booking-detail__scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}
</style>
