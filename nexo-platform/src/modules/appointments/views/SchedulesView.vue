<template>
  <div class="schedules">
    <div class="schedules__main">
      <WorkspaceToolbar
        :title="isWork ? 'Mi Horario' : 'Horarios'"
        :meta="isWork ? 'Tus turnos y excepciones' : 'Marco del negocio y horarios del equipo'"
      >
        <template #leading>
          <ImmersiveNavButton />
        </template>
      </WorkspaceToolbar>

      <div class="schedules__content">
        <div class="schedules__scroll">
          <div class="schedules__inner">
            <BusinessHoursEditor v-if="!isWork" />

            <div v-if="!isWork" class="schedules__intro">
              <span class="ws-eyebrow">Equipo</span>
              <h2 class="ws-section-title">Horarios del equipo</h2>
              <p class="ws-section-sub">
                Elegí un trabajador y ajustá sus turnos semanales dentro del marco del negocio.
              </p>
            </div>

            <ScheduleEditor />

            <HolidayCalendar />

            <p class="schedules__footnote">
              <v-icon size="13" aria-hidden="true">mdi-information-outline</v-icon>
              Los cambios se guardan por separado en cada sección. El marco del negocio siempre
              tiene prioridad sobre los turnos del equipo.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import ImmersiveNavButton from '@/shared/components/ImmersiveNavButton.vue';
import WorkspaceToolbar from '@/shared/components/WorkspaceToolbar.vue';
import BusinessHoursEditor from '../components/BusinessHoursEditor.vue';
import ScheduleEditor from '../components/ScheduleEditor.vue';
import HolidayCalendar from '../components/HolidayCalendar.vue';
import { useWorkspaceStore } from '@/shared/stores/workspace.store';

const workspaceStore = useWorkspaceStore();
const isWork = computed(() => workspaceStore.isWorkMode);
</script>

<style scoped>
.schedules {
  display: flex;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: rgb(var(--v-theme-background));
}

.schedules__main {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.schedules__content {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.schedules__scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.schedules__inner {
  width: 100%;
  max-width: 1120px;
  margin: 0 auto;
  padding: 24px 28px 64px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.schedules__intro {
  width: 100%;
  max-width: 640px;
  margin-inline: auto;
  padding: 2px 2px 0;
}

.schedules__footnote {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin: 0;
  padding: 2px 4px;
  font-size: 10px;
  line-height: 1.5;
  color: rgb(var(--v-theme-on-surface), 0.42);
}

.schedules__footnote .v-icon {
  flex-shrink: 0;
  margin-top: 1px;
}

@media (max-width: 899px) {
  .schedules__inner {
    padding: 18px 18px 80px;
  }
}

@media (max-width: 599px) {
  .schedules__inner {
    padding: 12px 10px calc(84px + env(safe-area-inset-bottom, 0px));
    gap: 14px;
  }

  .schedules__intro {
    padding-inline: 4px;
  }
}
</style>
