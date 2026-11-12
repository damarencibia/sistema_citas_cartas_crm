<template>
  <v-dialog
    :model-value="visible"
    :fullscreen="fullscreen"
    :max-width="fullscreen ? undefined : width"
    :scrim="fullscreen ? false : true"
    class="detail-dialog"
    @update:model-value="onUpdate"
  >
    <div
      class="detail-dialog__shell"
      :class="{ 'detail-dialog__shell--sealed': sealed, 'detail-dialog__shell--stretch': stretch }"
    >
      <!-- Header editorial: micro-título + meta -->
      <header class="detail-dialog__head">
        <div class="detail-dialog__headings">
          <h2 class="detail-dialog__title">{{ title }}</h2>
          <p v-if="meta" class="detail-dialog__meta">{{ meta }}</p>
        </div>
        <v-btn
          icon="mdi-close"
          size="small"
          variant="text"
          aria-label="Cerrar"
          @click="emit('close')"
        />
      </header>

      <!-- Tabs opcionales (Detalle de la cita / Cola de espera) -->
      <div v-if="$slots.tabs" class="detail-dialog__tabs">
        <slot name="tabs" />
      </div>

      <!-- Cuerpo: cada panel gestiona su scroll interno -->
      <div class="detail-dialog__body">
        <slot />
      </div>
    </div>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useDisplay } from 'vuetify';

defineProps<{
  visible: boolean;
  title: string;
  meta?: string;
  /** Estado cerrado: la fila se baña en success semitransparente (eco de la columna sellada) */
  sealed?: boolean;
  width?: number | string;
  /**
   * Altura definida (`calc(100dvh - 48px)`) en vez de `max-height`: obligatorio cuando el
   * panel interno necesita que la cadena `height: 100%` del slot resuelva (footer sticky
   * con scroll interno); un `max-height` solo deja el padre en altura auto y los porcentajes
   * no aplican. Fullscreen la ignora (ya es 100%).
   */
  stretch?: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

const { smAndDown } = useDisplay();
const fullscreen = computed(() => smAndDown.value);

function onUpdate(value: unknown) {
  if (!value) emit('close');
}
</script>

<style scoped>
.detail-dialog__shell {
  --detail-hairline: rgb(var(--v-theme-on-surface), 0.12);
  display: flex;
  flex-direction: column;
  width: 100%;
  max-height: calc(100dvh - 48px);
  overflow: hidden;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  border-radius: 8px;
  box-shadow: 0 18px 48px rgb(var(--v-theme-on-surface), 0.2);
}

/* Día cerrado: wash success sin tapar el contenido (inset-shadow separa capas) */
.detail-dialog__shell--sealed {
  box-shadow: inset 0 0 0 9999px rgb(var(--v-theme-success), 0.04),
    0 18px 48px rgb(var(--v-theme-on-surface), 0.2);
}

/* Modo stretch: altura definida para que el slot resuelva `height: 100%` */
.detail-dialog__shell--stretch {
  height: calc(100dvh - 48px);
}

.detail-dialog__head {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  flex-shrink: 0;
  padding: 14px 12px 10px 18px;
  border-bottom: 1px solid var(--detail-hairline);
}

.detail-dialog__headings {
  min-width: 0;
  flex: 1 1 auto;
}

.detail-dialog__title {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-on-surface));
}

.detail-dialog__meta {
  margin: 3px 0 0;
  font-size: 11px;
  letter-spacing: 0.02em;
  color: rgb(var(--v-theme-on-surface), 0.6);
}

.detail-dialog__tabs {
  flex-shrink: 0;
  border-bottom: 1px solid var(--detail-hairline);
}

.detail-dialog__body {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}
</style>

<style>
/* El overlay es generado por Vuetify: estilos globales para el wrapper y fullscreen */
.detail-dialog .v-overlay__content {
  border-radius: 8px;
}

.detail-dialog .v-dialog--fullscreen .v-overlay__content {
  height: 100%;
  border-radius: 0;
}

.detail-dialog .v-dialog--fullscreen .detail-dialog__shell {
  height: 100%;
  max-height: none;
  border-radius: 0;
}

@media (prefers-reduced-motion: reduce) {
  .detail-dialog .v-overlay__content {
    transition: none !important;
    animation: none !important;
  }
}
</style>
