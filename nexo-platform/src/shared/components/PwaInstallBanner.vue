<template>
  <div
    class="pwa-install-wrap"
    :class="{
      'pwa-install-wrap--desktop': isDesktop,
    }"
  >
    <v-banner
      v-if="pwa.canInstall.value"
      color="primary"
      lines="two"
      icon="mdi-cellphone-arrow-down"
      class="pwa-banner"
    >
      <v-banner-text class="pwa-banner__text">
        Instala la aplicación para recibir las notificaciones de forma más rápida y abrirla a
        pantalla completa.
      </v-banner-text>
      <v-btn
        class="pwa-banner__close"
        icon
        variant="text"
        size="x-small"
        aria-label="Cerrar"
        @click="dismiss"
      >
        <v-icon>mdi-close</v-icon>
      </v-btn>
      <template #actions>
        <v-btn
          variant="text"
          :loading="installing"
          :disabled="installing"
          @click="install"
        >
          Instalar
        </v-btn>
        <v-btn variant="text" @click="dismiss">Ahora no</v-btn>
      </template>
    </v-banner>

    <v-banner
      v-if="showIosGuide"
      color="secondary"
      lines="three"
      icon="mdi-iphone"
      class="pwa-banner"
    >
      <v-banner-text class="pwa-banner__text">
        Para recibir notificaciones en iPhone/iPad: abre el menú <strong>Compartir</strong> y elige
        <strong>"Añadir a pantalla de inicio"</strong>. Después activa las notificaciones en el
        centro de notificaciones.
      </v-banner-text>
      <v-btn
        class="pwa-banner__close"
        icon
        variant="text"
        size="x-small"
        aria-label="Cerrar"
        @click="dismiss"
      >
        <v-icon>mdi-close</v-icon>
      </v-btn>
      <template #actions>
        <v-btn variant="text" @click="dismiss">Entendido</v-btn>
      </template>
    </v-banner>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useDisplay } from 'vuetify';
import { usePwaInstall } from '@/shared/composables/usePwaInstall';
import { usePushStore } from '@/shared/stores/push.store';

const pwa = usePwaInstall();
const pushStore = usePushStore();
const installing = ref(false);
const { smAndDown } = useDisplay();

const DISMISS_KEY = 'nexo:pwa-install-dismissed';

const isDesktop = computed(() => !smAndDown.value);

const isIos = computed(() => {
  if (typeof navigator === 'undefined') return false;
  return (
    /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.userAgent.includes('Mac') && 'ontouchend' in document)
  );
});

const dismissed = ref(false);

const showIosGuide = computed(
  () =>
    isIos.value &&
    !pwa.isStandalone.value &&
    !pwa.canInstall.value &&
    !pushStore.isEnabled &&
    !dismissed.value,
);

async function install() {
  installing.value = true;
  try {
    await pwa.install();
  } finally {
    installing.value = false;
  }
}

function dismiss() {
  dismissed.value = true;
  localStorage.setItem(DISMISS_KEY, '1');
}

onMounted(() => {
  dismissed.value = localStorage.getItem(DISMISS_KEY) === '1';
});
</script>

<style scoped>
.pwa-install-wrap {
  position: fixed;
  bottom: 16px;
  left: 8px;
  right: 8px;
  z-index: 900;
}

.pwa-install-wrap--desktop {
  left: 68px;
}

.pwa-banner {
  position: relative;
  border: 1px solid rgb(var(--v-border)) !important;
  border-radius: 8px !important;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06), 0 4px 16px rgba(0, 0, 0, 0.08) !important;
}

.pwa-banner__text {
  padding-right: 28px;
}

.pwa-banner__close {
  position: absolute;
  top: 4px;
  right: 4px;
}
</style>
