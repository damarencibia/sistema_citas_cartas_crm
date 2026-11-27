<template>
  <div>
    <!-- Solo en modo standalone (el drawer consume la lista sin header) -->
    <template v-if="!hideHeader">
      <div class="wq__head">
        <span class="wq__section-label">En cola para este turno</span>
        <span v-if="entries.length > 0" class="wq__count">{{ entries.length }}</span>
      </div>
      <p class="wq__hint">
        {{ entries.length }} cliente{{ entries.length === 1 ? '' : 's' }}
        solicita{{ entries.length === 1 ? '' : 'n' }} este turno.
      </p>
    </template>

    <div class="wq__list">
      <WaitlistEntryRow
        v-for="(entry, index) in entries"
        :key="entry.id"
        :entry="entry"
        :index="index + 1"
        :slot-label="slotLabel"
        :tenant-name="tenantName"
        show-remove
        @remove="emit('remove', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import WaitlistEntryRow from './WaitlistEntryRow.vue';
import type { WaitlistEntry } from '../types/booking.types';

defineProps<{
  entries: WaitlistEntry[];
  slotLabel?: string;
  tenantName?: string;
  hideHeader?: boolean;
}>();

const emit = defineEmits<{
  remove: [entry: WaitlistEntry];
}>();
</script>

<style scoped>
.wq__section-label {
  font-size: 10px;
  line-height: 1.4;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-on-surface), 0.55);
}

.wq__head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.wq__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  padding: 1px 5px;
  border: 1px solid rgb(var(--v-theme-on-surface), 0.18);
  border-radius: 4px;
  background: rgb(var(--v-theme-on-surface), 0.04);
  color: rgb(var(--v-theme-on-surface), 0.65);
  font-size: 10px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.wq__hint {
  margin: 0 0 10px;
  font-size: 12px;
  line-height: 1.45;
  color: rgb(var(--v-theme-on-surface), 0.55);
}

.wq__list {
  display: flex;
  flex-direction: column;
}
</style>
