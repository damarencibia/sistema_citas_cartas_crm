<template>
  <v-text-field
    v-model="search"
    :label="label || 'Buscar'"
    prepend-inner-icon="mdi-magnify"
    clearable
    hide-details
    density="compact"
    variant="outlined"
    @input="onInput"
    @click:clear="onClear"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useDebounce } from '@/shared/composables/useDebounce';

defineProps<{ label?: string }>();
const emit = defineEmits<{ search: [value: string] }>();

const search = ref('');

const debouncedSearch = useDebounce((value: string) => {
  emit('search', value);
}, 300);

function onInput() {
  debouncedSearch(search.value);
}

function onClear() {
  search.value = '';
  emit('search', '');
}
</script>
