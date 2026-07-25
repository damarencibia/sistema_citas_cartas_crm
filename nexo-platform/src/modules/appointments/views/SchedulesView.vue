<template>
  <div>
    <PageHeader title="Horarios" subtitle="Configura los horarios de tus empleados" />
    <v-card class="pa-4">
      <ScheduleEditor />
      <v-divider class="my-6" />
      <HolidayCalendar />
    </v-card>
  </div>
</template>

<script setup lang="ts">
import PageHeader from '@/shared/components/PageHeader.vue';
import ScheduleEditor from '../components/ScheduleEditor.vue';
import HolidayCalendar from '../components/HolidayCalendar.vue';
</script>
