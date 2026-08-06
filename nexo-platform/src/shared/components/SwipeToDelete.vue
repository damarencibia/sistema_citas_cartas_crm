<template>
  <div
    ref="rootRef"
    class="swipe-to-delete"
    :class="{ 'swipe-to-delete--collapsing': collapsing }"
    @click.capture="onClickCapture"
  >
    <div class="swipe-to-delete__inner">
      <div
        class="swipe-to-delete__bg"
        :class="{ 'swipe-to-delete__bg--visible': dragging || pastThreshold }"
      >
        <v-icon
          class="swipe-to-delete__icon"
          :class="{
            'swipe-to-delete__icon--right': iconSide === 'right',
            'swipe-to-delete__icon--left': iconSide === 'left',
            'swipe-to-delete__icon--triggered': pastThreshold,
          }"
          size="26"
        >
          mdi-trash-can-outline
        </v-icon>
      </div>
      <div
        class="swipe-to-delete__foreground"
        :style="{ transform: `translateX(${dragX}px)`, transition: foregroundTransition }"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerEnd"
        @pointercancel="onPointerEnd"
      >
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

const emit = defineEmits<{ delete: [] }>();

const rootRef = ref<HTMLElement | null>(null);
const dragX = ref(0);
const dragging = ref(false);
const pastThreshold = ref(false);
const collapsing = ref(false);

const activePointerId = ref<number | null>(null);
const startX = ref(0);
const startY = ref(0);
const width = ref(0);
const suppressClick = ref(false);

const threshold = computed(() => Math.max(72, width.value * 0.3));
const iconSide = computed<'left' | 'right'>(() => (dragX.value < 0 ? 'right' : 'left'));

const foregroundTransition = computed(() =>
  dragging.value ? 'none' : 'transform 0.25s cubic-bezier(0.22, 0.61, 0.36, 1)',
);

function onPointerDown(e: PointerEvent) {
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  activePointerId.value = e.pointerId;
  startX.value = e.clientX;
  startY.value = e.clientY;
  dragging.value = false;
  pastThreshold.value = false;
  suppressClick.value = false;
  try {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  } catch {
    /* noop */
  }
}

function onPointerMove(e: PointerEvent) {
  if (activePointerId.value !== e.pointerId) return;
  const dx = e.clientX - startX.value;
  const dy = e.clientY - startY.value;
  if (!dragging.value) {
    if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
    if (Math.abs(dy) > Math.abs(dx)) {
      activePointerId.value = null;
      return;
    }
    dragging.value = true;
    width.value = rootRef.value?.offsetWidth ?? 0;
  }
  dragX.value = dx;
  pastThreshold.value = Math.abs(dx) > threshold.value;
}

function onPointerEnd(e: PointerEvent) {
  if (activePointerId.value !== e.pointerId) return;
  activePointerId.value = null;
  if (!dragging.value) return;
  dragging.value = false;

  if (Math.abs(dragX.value) > threshold.value) {
    const direction = dragX.value < 0 ? -1 : 1;
    dragX.value = direction * (width.value + 4);
    window.setTimeout(() => {
      collapsing.value = true;
    }, 200);
    window.setTimeout(() => {
      emit('delete');
    }, 420);
  } else {
    dragX.value = 0;
  }
}

function onClickCapture(e: Event) {
  if (suppressClick.value) {
    e.preventDefault();
    e.stopPropagation();
    suppressClick.value = false;
  }
}
</script>

<style scoped>
.swipe-to-delete {
  display: grid;
  grid-template-rows: 1fr;
  transition: grid-template-rows 0.22s ease;
  overflow: hidden;
  border-radius: 4px;
}

.swipe-to-delete--collapsing {
  grid-template-rows: 0fr;
}

.swipe-to-delete__inner {
  position: relative;
  min-height: 0;
  overflow: hidden;
}

.swipe-to-delete__bg {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  background: rgb(var(--v-theme-error));
  color: #fff;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.swipe-to-delete__bg--visible {
  opacity: 1;
}

.swipe-to-delete__icon {
  transition: transform 0.15s ease;
}

.swipe-to-delete__icon--right {
  margin-left: auto;
  margin-right: 18px;
}

.swipe-to-delete__icon--left {
  margin-right: auto;
  margin-left: 18px;
}

.swipe-to-delete__icon--triggered {
  transform: scale(1.2);
}

.swipe-to-delete__foreground {
  position: relative;
  touch-action: pan-y;
  user-select: none;
  -webkit-user-select: none;
}
</style>
