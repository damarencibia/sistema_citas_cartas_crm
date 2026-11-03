<template>
  <div>
    <PageHeader title="Etiquetas" subtitle="Clasifica a tus clientes con etiquetas personalizadas">
      <template #actions>
        <v-btn color="primary" @click="openCreate">
          <v-icon start>mdi-plus</v-icon>
          Nueva Etiqueta
        </v-btn>
      </template>
    </PageHeader>

    <v-container fluid class="py-4">
      <v-card v-if="store.loading" class="pa-4">
        <v-skeleton-loader type="card" />
      </v-card>

      <v-card v-else class="pa-6">
        <!-- Sin etiquetas -->
        <EmptyState
          v-if="store.tags.length === 0"
          icon="mdi-tag-plus-outline"
          title="Todavía no tienes etiquetas"
          description="Usa etiquetas para segmentar clientes: VIP, minorista, mayorista, etc."
        >
          <template #actions>
            <v-btn color="primary" variant="flat" @click="openCreate">
              <v-icon start>mdi-plus</v-icon>
              Crear primera etiqueta
            </v-btn>
          </template>
        </EmptyState>

        <template v-else>
          <div class="text-overline text-medium-emphasis mb-2">
            Etiquetas del sistema
          </div>
          <div class="d-flex flex-wrap ga-2 mb-6">
            <v-chip
              v-for="tag in store.systemTags"
              :key="tag.id"
              :style="chipStyle(tag.color)"
              variant="tonal"
              size="small"
            >
              {{ tag.name }}
            </v-chip>
          </div>

          <div class="text-overline text-medium-emphasis mb-2">
            Etiquetas personalizadas
          </div>
          <EmptyState
            v-if="store.customTags.length === 0"
            icon="mdi-tag-outline"
            title="Sin etiquetas personalizadas"
            description="Crea etiquetas propias para segmentar a tus clientes"
          />
          <v-list v-else class="py-0 bg-transparent">
            <template v-for="(tag, i) in store.customTags" :key="tag.id">
              <v-list-item class="px-2 py-2">
                <div class="d-flex align-center ga-3 w-100">
                  <v-icon size="18" :style="{ color: tag.color ?? '#6b7280' }">mdi-tag</v-icon>
                  <span class="text-body-2 font-weight-medium flex-grow-1">
                    {{ tag.name }}
                  </span>
                  <v-btn
                    icon
                    variant="text"
                    size="x-small"
                    aria-label="Editar etiqueta"
                    @click="openEdit(tag)"
                  >
                    <v-icon size="16">mdi-pencil-outline</v-icon>
                  </v-btn>
                  <v-btn
                    icon
                    variant="text"
                    size="x-small"
                    color="error"
                    aria-label="Eliminar etiqueta"
                    @click="onDelete(tag)"
                  >
                    <v-icon size="16">mdi-trash-can-outline</v-icon>
                  </v-btn>
                </div>
              </v-list-item>
              <v-divider v-if="i < store.customTags.length - 1" />
            </template>
          </v-list>
        </template>
      </v-card>
    </v-container>

    <v-dialog
      :model-value="showForm"
      :fullscreen="$vuetify.display.smAndDown"
      :max-width="440"
      persistent
      @update:model-value="showForm = false"
    >
      <v-card :loading="saving">
        <v-card-title class="d-flex align-center pa-4">
          <v-btn
            v-if="$vuetify.display.smAndDown"
            icon
            variant="text"
            density="compact"
            class="mr-2"
            @click="showForm = false"
          >
            <v-icon>mdi-arrow-left</v-icon>
          </v-btn>
          <span class="text-h6 font-weight-medium">
            {{ editingTag ? 'Editar Etiqueta' : 'Nueva Etiqueta' }}
          </span>
        </v-card-title>
        <v-divider />

        <v-card-text class="pa-4">
          <v-form v-model="isValid" fast-fail @submit.prevent>
            <v-text-field
              v-model="form.name"
              label="Nombre *"
              :rules="[(v: string) => !!v?.trim() || 'El nombre es obligatorio']"
              class="mb-4"
            />
            <div class="text-caption text-medium-emphasis mb-2">Color</div>
            <div class="d-flex flex-wrap ga-2">
              <button
                v-for="color in palette"
                :key="color"
                type="button"
                class="tag-color-swatch"
                :class="{ 'tag-color-swatch--active': form.color === color }"
                :style="{ backgroundColor: color }"
                :aria-label="`Color ${color}`"
                @click="form.color = color"
              >
                <v-icon v-if="form.color === color" size="14" color="white">mdi-check</v-icon>
              </button>
            </div>
          </v-form>
        </v-card-text>

        <v-divider />
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="showForm = false">Cancelar</v-btn>
          <v-btn
            color="primary"
            :loading="saving"
            :disabled="!isValid"
            @click="onSave"
          >
            {{ editingTag ? 'Guardar Cambios' : 'Crear Etiqueta' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import PageHeader from '@/shared/components/PageHeader.vue';
import EmptyState from '@/shared/components/EmptyState.vue';
import { useNotification } from '@/shared/composables/useNotification';
import { useConfirm } from '@/shared/composables/useConfirm';
import { useCustomerStore } from '../stores/customer.store';
import type { Tag } from '../types/customer.types';

const store = useCustomerStore();
const notification = useNotification();
const { confirm: confirmAction } = useConfirm();

store.fetchTags();

const showForm = ref(false);
const editingTag = ref<Tag | null>(null);
const saving = ref(false);
const isValid = ref(false);

const palette = [
  '#6b7280', '#3b82f6', '#3ecf8e', '#e8a800',
  '#dc5454', '#8b5cf6', '#ec4899', '#14b8a6',
  '#f97316', '#64748b',
];

const form = reactive({ name: '', color: palette[0] });

function chipStyle(color: string | null): Record<string, string> {
  if (!color) return {};
  return { backgroundColor: `${color}22`, color, borderColor: color };
}

function openCreate() {
  editingTag.value = null;
  form.name = '';
  form.color = palette[0];
  showForm.value = true;
}

function openEdit(tag: Tag) {
  editingTag.value = tag;
  form.name = tag.name;
  form.color = tag.color ?? palette[0];
  showForm.value = true;
}

async function onSave() {
  saving.value = true;
  try {
    if (editingTag.value) {
      await store.updateTag(editingTag.value.id, form.name, form.color);
      notification.success('Etiqueta actualizada');
    } else {
      await store.createTag(form.name, form.color);
      notification.success('Etiqueta creada');
    }
    showForm.value = false;
  } catch {
    notification.error('No se pudo guardar la etiqueta');
  } finally {
    saving.value = false;
  }
}

async function onDelete(tag: Tag) {
  const ok = await confirmAction(
    `Se eliminará "${tag.name}" y dejará de estar asignada a todos los clientes.`,
    'Eliminar Etiqueta',
    { danger: true, confirmText: 'Eliminar' },
  );
  if (!ok) return;
  try {
    await store.deleteTag(tag.id);
    notification.success('Etiqueta eliminada');
  } catch {
    notification.error('No se pudo eliminar la etiqueta');
  }
}
</script>

<style scoped>
.tag-color-swatch {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: 2px solid transparent;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.1s ease;
}

.tag-color-swatch:hover {
  transform: scale(1.1);
}

.tag-color-swatch--active {
  border-color: rgb(var(--v-theme-on-surface));
}
</style>
