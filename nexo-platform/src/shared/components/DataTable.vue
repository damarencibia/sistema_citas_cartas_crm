<template>
  <v-data-table-server
    v-bind="$attrs"
    :items="items"
    :items-length="total"
    :loading="loading"
    :items-per-page="itemsPerPage"
    @update:options="onUpdateOptions"
  >
    <template v-for="(_, slot) in $slots" #[slot]="scope">
      <slot :name="slot" v-bind="scope" />
    </template>
    <template #bottom>
      <div class="d-flex align-center justify-end pa-4">
        <v-pagination
          v-model="page"
          :length="totalPages"
          :total-visible="5"
          size="small"
        />
      </div>
    </template>
  </v-data-table-server>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  items: any[];
  total: number;
  loading: boolean;
  itemsPerPage?: number;
}>();

const emit = defineEmits<{
  'update:options': [options: any];
}>();

const page = defineModel<number>('page', { default: 1 });
const itemsPerPage = computed(() => props.itemsPerPage ?? 20);
const totalPages = computed(() => Math.ceil(props.total / itemsPerPage.value));

function onUpdateOptions(options: any) {
  emit('update:options', options);
}
</script>
