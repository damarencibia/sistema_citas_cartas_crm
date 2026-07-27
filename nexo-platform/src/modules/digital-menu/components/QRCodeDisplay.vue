<template>
  <div class="text-center">
    <img v-if="src" :src="src" alt="QR Code" class="mx-auto" style="width: 180px; height: 180px;" />
    <div class="text-caption mt-2">Escanea para abrir la carta</div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { toDataURL } from 'qrcode';

const props = defineProps<{ value: string }>();
const src = ref<string>('');

async function generate() {
  if (!props.value) return;
  try {
    src.value = await toDataURL(props.value, { margin: 1, width: 180 });
  } catch (error) {
    console.error('QR generation failed', error);
  }
}

watch(() => props.value, generate, { immediate: true });

onMounted(generate);
</script>
