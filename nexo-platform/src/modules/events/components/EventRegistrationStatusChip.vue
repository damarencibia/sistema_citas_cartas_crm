<template>
  <v-chip :color="config.color" :size="size ?? 'small'" label>
    <v-icon start :size="14">{{ config.icon }}</v-icon>
    {{ config.label }}
  </v-chip>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { EventRegistrationStatus } from '../types/event.types';

const props = defineProps<{
  status: EventRegistrationStatus;
  size?: string;
}>();

const statusMap: Record<EventRegistrationStatus, { label: string; color: string; icon: string }> = {
  confirmed: { label: 'Confirmado', color: 'success', icon: 'mdi-check-circle' },
  waitlisted: { label: 'En espera', color: 'warning', icon: 'mdi-clock-alert' },
  attended: { label: 'Asistió', color: 'info', icon: 'mdi-check-all' },
  cancelled: { label: 'Cancelado', color: 'grey', icon: 'mdi-close-circle' },
};

const config = computed(() => statusMap[props.status] ?? { label: props.status, color: 'grey', icon: 'mdi-help' });
</script>