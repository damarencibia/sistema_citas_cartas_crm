<template>
  <div class="wl">
    <header class="wl__head">
      <div class="wl__headings">
        <span class="ws-eyebrow">Lista de espera</span>
        <h2 class="ws-section-title">Cola de espera</h2>
        <p class="ws-section-sub">
          Personas esperando una cancelación o un turno disponible.
        </p>
      </div>
      <span v-if="entries.length" class="wl__total">
        {{ entries.length }} {{ entries.length === 1 ? 'persona' : 'personas' }}
      </span>
    </header>

    <div v-if="loading" class="wl__loading">
      <v-progress-circular indeterminate size="24" color="on-surface" />
    </div>

    <div v-else-if="entries.length === 0" class="wl__empty">
      <v-icon size="22" aria-hidden="true">mdi-clock-outline</v-icon>
      <span>No hay personas en la lista de espera.</span>
    </div>

    <template v-else>
      <div class="wl__stats">
        <span class="wl__stat">
          <span class="wl__stat-value">{{ waitingCount }}</span>
          <span class="wl__stat-label">esperando</span>
        </span>
        <span class="wl__stat-sep" aria-hidden="true" />
        <span class="wl__stat">
          <span class="wl__stat-value">{{ notifiedCount }}</span>
          <span class="wl__stat-label">notificados</span>
        </span>
        <span class="wl__stat-sep" aria-hidden="true" />
        <span class="wl__stat">
          <span class="wl__stat-value">{{ entries.length }}</span>
          <span class="wl__stat-label">en total</span>
        </span>
      </div>

      <div class="wl__filters" role="tablist" aria-label="Filtrar lista de espera">
        <button
          v-for="f in filterOptions"
          :key="f.value"
          type="button"
          role="tab"
          class="wl__filter"
          :class="{ 'wl__filter--active': statusFilter === f.value }"
          :aria-selected="statusFilter === f.value"
          @click="statusFilter = f.value"
        >
          {{ f.label }}
          <span class="wl__filter-count">{{ f.count }}</span>
        </button>
      </div>

      <div v-if="filteredEntries.length" class="wl__list">
        <WaitlistEntryRow
          v-for="(entry, index) in filteredEntries"
          :key="entry.id"
          :entry="entry"
          :index="index + 1"
          show-status
          show-preferred
          show-employee
          :show-remove="canRemove(entry)"
          @remove="emit('cancel', $event)"
        />
      </div>

      <div v-else class="wl__empty wl__empty--filtered">
        <v-icon size="18" aria-hidden="true">mdi-filter-variant</v-icon>
        <span>Sin entradas en este estado.</span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import WaitlistEntryRow from './WaitlistEntryRow.vue';
import type { WaitlistEntry } from '../types/booking.types';

const props = defineProps<{
  entries: WaitlistEntry[];
  loading: boolean;
}>();

const emit = defineEmits<{
  cancel: [entry: WaitlistEntry];
}>();

type FilterValue = 'all' | WaitlistEntry['status'];

interface FilterOption {
  value: FilterValue;
  label: string;
  count: number;
}

const statusFilter = ref<FilterValue>('all');

const filterOptions = computed<FilterOption[]>(() => {
  const count = (status: FilterValue) =>
    status === 'all'
      ? props.entries.length
      : props.entries.filter((entry) => entry.status === status).length;

  return [
    { value: 'all', label: 'Todas', count: count('all') },
    { value: 'waiting', label: 'Esperando', count: count('waiting') },
    { value: 'notified', label: 'Notificados', count: count('notified') },
    { value: 'converted', label: 'Convertidos', count: count('converted') },
    { value: 'expired', label: 'Expirados', count: count('expired') },
  ];
});

const filteredEntries = computed(() =>
  statusFilter.value === 'all'
    ? props.entries
    : props.entries.filter((entry) => entry.status === statusFilter.value),
);

const waitingCount = computed(() => props.entries.filter((e) => e.status === 'waiting').length);
const notifiedCount = computed(() => props.entries.filter((e) => e.status === 'notified').length);

function canRemove(entry: WaitlistEntry): boolean {
  return entry.status === 'waiting' || entry.status === 'notified';
}
</script>

<style scoped>
.wl {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.wl__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  padding-bottom: 14px;
  border-bottom: 1px solid rgb(var(--v-theme-on-surface), 0.1);
}

.wl__headings {
  min-width: 0;
}

.wl__total {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 3px 9px;
  border: 1px solid rgb(var(--v-theme-on-surface), 0.14);
  border-radius: 4px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-on-surface), 0.55);
}

.wl__loading {
  display: flex;
  justify-content: center;
  padding: 40px 20px;
}

.wl__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 42px 20px;
  font-size: 12px;
  color: rgb(var(--v-theme-on-surface), 0.5);
}

.wl__empty--filtered {
  padding: 28px 20px;
}

.wl__stats {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  padding: 14px 0 10px;
}

.wl__stat {
  display: inline-flex;
  align-items: baseline;
  gap: 5px;
}

.wl__stat-value {
  font-size: 16px;
  line-height: 1;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: rgb(var(--v-theme-on-surface));
}

.wl__stat-label {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-on-surface), 0.45);
}

.wl__stat-sep {
  width: 1px;
  height: 16px;
  background: rgb(var(--v-theme-on-surface), 0.12);
}

.wl__filters {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 5px;
  padding-bottom: 8px;
}

.wl__filter {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 0 12px;
  border: 1px solid rgb(var(--v-theme-on-surface), 0.14);
  border-radius: 999px;
  background: transparent;
  color: rgb(var(--v-theme-on-surface), 0.62);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}

.wl__filter:active {
  background: rgb(var(--v-theme-on-surface), 0.06);
}

.wl__filter--active {
  border-color: rgb(var(--v-theme-on-surface));
  background: rgb(var(--v-theme-on-surface));
  color: rgb(var(--v-theme-surface));
}

.wl__filter--active:active {
  background: rgb(var(--v-theme-on-surface));
}

.wl__filter-count {
  font-size: 9px;
  font-variant-numeric: tabular-nums;
  opacity: 0.62;
}

.wl__list {
  display: flex;
  flex-direction: column;
  border-top: 1px solid rgb(var(--v-theme-on-surface), 0.1);
}

@media (max-width: 699px) {
  .wl__head {
    flex-direction: column;
    gap: 8px;
  }

  .wl__total {
    align-self: flex-start;
  }

  .wl__filters {
    flex-wrap: nowrap;
    overflow-x: auto;
    padding-bottom: 10px;
    scrollbar-width: none;
  }

  .wl__filters::-webkit-scrollbar {
    display: none;
  }

  .wl__filter {
    flex-shrink: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .wl__filter {
    transition: none;
  }
}
</style>
