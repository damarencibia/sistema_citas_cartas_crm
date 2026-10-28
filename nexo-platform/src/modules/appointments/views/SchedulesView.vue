<template>
  <div>
    <PageHeader
      :title="isWork ? 'Mi Horario' : 'Horarios'"
      :subtitle="isWork
        ? 'Configura tus turnos semanales y tus días libres'
        : 'El marco del negocio y los horarios de tu equipo'"
    />
    <div class="d-flex flex-column ga-6">
      <BusinessHoursEditor v-if="!isWork" />
      <div v-if="!isWork" class="text-subtitle-1 font-weight-medium px-1">
        Horarios de los Empleados
      </div>
      <ScheduleEditor />
      <HolidayCalendar />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import PageHeader from '@/shared/components/PageHeader.vue';
import BusinessHoursEditor from '../components/BusinessHoursEditor.vue';
import ScheduleEditor from '../components/ScheduleEditor.vue';
import HolidayCalendar from '../components/HolidayCalendar.vue';
import { useWorkspaceStore } from '@/shared/stores/workspace.store';

const workspaceStore = useWorkspaceStore();
const isWork = computed(() => workspaceStore.isWorkMode);
</script>
