<template>
  <div class="sound-controls">
    <v-tooltip text="Alternar sonidos">
      <template #activator="{ props }">
        <v-btn
          v-bind="props"
          icon
          size="small"
          variant="text"
          @click="toggleSound"
        >
          <v-icon :size="20">
            {{ soundStore.isMuted ? 'mdi-volume-off' : 'mdi-volume-high' }}
          </v-icon>
        </v-btn>
      </template>
    </v-tooltip>

    <v-tooltip text="Probar sonido">
      <template #activator="{ props }">
        <v-btn
          v-bind="props"
          icon
          size="small"
          variant="text"
          @click="testSound"
        >
          <v-icon :size="20">mdi-speaker-play</v-icon>
        </v-btn>
      </template>
    </v-tooltip>
  </div>
</template>

<script setup lang="ts">
import { useSound } from '../composables/useSound';

const soundStore = useSound();

async function toggleSound() {
  soundStore.toggleMute();
}

async function testSound() {
  await soundStore.playNewOrderSound();
}
</script>

<style scoped>
.sound-controls {
  display: flex;
  gap: 4px;
  align-items: center;
}
</style>
