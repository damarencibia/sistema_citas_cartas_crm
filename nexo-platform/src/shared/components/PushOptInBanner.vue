<template>
  <div class="push-banner-wrap" :class="{ 'push-banner-wrap--desktop': isDesktop }">
    <v-banner
      v-if="pushStore.canPrompt"
      color="primary"
      lines="one"
      icon="mdi-bell-ring-outline"
      class="push-banner"
    >
      <v-banner-text>
        Activa las notificaciones del navegador para enterarte de nuevas reservas, aprobaciones y ofertas.
        <template v-if="isIos">
          <br>
          <span class="text-caption">
            En iPhone/iPad: instala la app (Compartir → "Añadir a pantalla de inicio") para poder activarlas.
          </span>
        </template>
      </v-banner-text>
      <template #actions>
        <v-btn
          variant="text"
          :loading="pushStore.enabling"
          :disabled="pushStore.enabling"
          @click="enable"
        >
          Activar
        </v-btn>
        <v-btn variant="text" @click="dismiss">Ahora no</v-btn>
      </template>
    </v-banner>

    <v-snackbar
      v-if="pushStore.error"
      v-model="showError"
      color="error"
      timeout="6000"
      location="top"
    >
      {{ pushStore.error }}
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useDisplay } from 'vuetify';
import { usePushStore } from '@/shared/stores/push.store';

const pushStore = usePushStore();
const showError = ref(false);
const { smAndDown } = useDisplay();

const isDesktop = computed(() => !smAndDown.value);

const isIos = computed(() => {
  if (typeof navigator === 'undefined') return false;
  return (
    /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.userAgent.includes('Mac') && 'ontouchend' in document)
  );
});

async function enable() {
  await pushStore.enable();
  if (pushStore.error) showError.value = true;
}

function dismiss() {
  pushStore.dismiss();
}

watch(
  () => pushStore.error,
  (err) => {
    if (err) showError.value = true;
  },
);

onMounted(() => {
  pushStore.init();
});
</script>

<style scoped>
.push-banner-wrap {
  position: fixed;
  top: 56px;
  left: 8px;
  right: 8px;
  z-index: 900;
}

.push-banner-wrap--desktop {
  left: 68px;
}

.push-banner {
  border: 1px solid rgb(var(--v-border)) !important;
  border-radius: 8px !important;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06), 0 4px 16px rgba(0, 0, 0, 0.08) !important;
}
</style>
