<template>
  <div>
    <PageHeader
      :title="isWork ? 'Mi Horario' : 'Horarios'"
      :subtitle="isWork
        ? 'Configura tus turnos semanales y tus días libres'
        : 'Configura los horarios de tus empleados'"
    />
    <div class="d-flex flex-column ga-6">
      <ScheduleEditor />
      <HolidayCalendar />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import PageHeader from '@/shared/components/PageHeader.vue';
import ScheduleEditor from '../components/ScheduleEditor.vue';
import HolidayCalendar from '../components/HolidayCalendar.vue';
import { useWorkspaceStore } from '@/shared/stores/workspace.store';

const workspaceStore = useWorkspaceStore();
const isWork = computed(() => workspaceStore.isWorkMode);
</script>
