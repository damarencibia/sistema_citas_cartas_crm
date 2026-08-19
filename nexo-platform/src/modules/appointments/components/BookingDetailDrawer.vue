<template>
  <v-navigation-drawer
    :model-value="visible"
    temporary
    location="right"
    :width="smAndDown ? '100%' : 600"
    :scrim="smAndDown ? false : true"
    class="booking-detail-drawer"
    @update:model-value="(v) => !v && emit('close')"
  >
    <template v-if="booking">
      <div class="booking-detail__shell d-flex flex-column">
        <div class="booking-detail__headerbar d-flex align-center flex-shrink-0">
          <v-tabs
            v-model="detailTab"
            density="compact"
            color="primary"
            class="flex-grow-1"
          >
            <v-tab value="detail">Detalle de la cita</v-tab>
            <v-tab value="queue">
              Cola de espera
              <v-chip
                v-if="queueCount > 0"
                size="x-small"
                variant="tonal"
                color="primary"
                class="ml-1"
              >
                {{ queueCount }}
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

        <BookingDetailInfo
          v-if="detailTab === 'detail'"
          :booking="booking"
          :show-actions="showActions"
          :waitlist-entries="waitlistEntries"
          @cancel-turn="(d) => emit('cancelTurn', d)"
        />

        <BookingWaitlistTab
          v-if="detailTab === 'queue'"
          :booking="booking"
          :waitlist-entries="waitlistEntries"
          :tenant-name="tenantName"
          @waitlist-convert="(e) => emit('waitlistConvert', e)"
          @waitlist-remove="(e) => emit('waitlistRemove', e)"
        />
      </div>
    </template>
  </v-navigation-drawer>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useDisplay } from 'vuetify';
import BookingDetailInfo from './BookingDetailInfo.vue';
import BookingWaitlistTab from './BookingWaitlistTab.vue';
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
  cancelTurn: [data: { assign: boolean; keepBlocked: boolean; reason: string }];
  waitlistConvert: [entry: WaitlistEntry];
  waitlistRemove: [entry: WaitlistEntry];
}>();

const { smAndDown } = useDisplay();
const detailTab = ref<'detail' | 'queue'>('detail');

const queueCount = computed(() => props.waitlistEntries?.length ?? 0);
</script>

<style scoped>
.booking-detail-drawer {
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

.booking-detail-drawer :deep(.v-navigation-drawer__content) {
  overflow: hidden;
}

.booking-detail__shell {
  position: relative;
  height: 100dvh;
}

.booking-detail__headerbar {
  border-bottom: 1px solid rgb(var(--v-border));
}
</style>
