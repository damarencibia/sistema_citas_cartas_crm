<template>
  <div>
    <PageHeader title="Horarios" subtitle="Configura los horarios de tus empleados" />
    <div class="d-flex flex-column ga-6">
      <ScheduleEditor />
      <HolidayCalendar />
    </div>
  </div>
</template>

<script setup lang="ts">
import PageHeader from '@/shared/components/PageHeader.vue';
import ScheduleEditor from '../components/ScheduleEditor.vue';
import HolidayCalendar from '../components/HolidayCalendar.vue';
</script>
