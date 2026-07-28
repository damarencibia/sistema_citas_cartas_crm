<template>
  <div>
    <PageHeader title="Categorías de Servicios" subtitle="Define las categorías de servicios de tu negocio">
      <template #actions>
        <v-btn color="primary" @click="openCreate">
          <v-icon start>mdi-plus</v-icon>
          Nueva Categoría
        </v-btn>
      </template>
    </PageHeader>

    <div v-if="categoryStore.loading" class="text-center pa-8">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <div v-else-if="categoryStore.categories.length === 0" class="text-center pa-8">
      <v-icon size="64" color="medium-emphasis">mdi-shape-outline</v-icon>
      <p class="text-body-1 text-medium-emphasis mt-4">No hay categorías configuradas</p>
      <p class="text-caption text-medium-emphasis mb-4">Crea categorías como Barbería, Manicura, Estilista, etc.</p>
      <v-btn color="primary" variant="flat" @click="openCreate">
        Crear Primera Categoría
      </v-btn>
    </div>

    <v-row v-else>
      <v-col
        v-for="category in categoryStore.categories"
        :key="category.id"
        cols="12"
        sm="6"
        md="4"
      >
        <v-card hover @click="openDetail(category)">
          <v-card-text>
            <div class="d-flex align-center ga-3">
              <v-avatar :color="category.is_active ? 'primary' : 'grey'" size="44" variant="tonal">
                <v-icon>{{ category.icon || 'mdi-tag-outline' }}</v-icon>
              </v-avatar>
              <div class="flex-grow-1">
                <div class="text-subtitle-1 font-weight-medium">{{ category.name }}</div>
                <div v-if="category.description" class="text-caption text-medium-emphasis">
                  {{ category.description }}
                </div>
              </div>
              <v-menu>
                <template #activator="{ props: menuProps }">
                  <v-btn
                    icon="mdi-dots-vertical"
                    size="small"
                    variant="text"
                    v-bind="menuProps"
                    @click.stop
                  />
                </template>
                <v-list density="compact">
                  <v-list-item prepend-icon="mdi-pencil" title="Editar" @click.stop="openEdit(category)" />
                  <v-list-item
                    prepend-icon="mdi-delete"
                    title="Eliminar"
                    class="text-error"
                    @click.stop="onDelete(category)"
                  />
                </v-list>
              </v-menu>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <CategoryForm
      :visible="showForm"
      :category="editingCategory"
      @close="closeForm"
      @save="onSave"
    />

    <ServiceCategoryDetailDialog
      v-if="detailCategory"
      :visible="showDetail"
      :category="detailCategory"
      @close="showDetail = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import PageHeader from '@/shared/components/PageHeader.vue';
import { useNotification } from '@/shared/composables/useNotification';
import { useConfirm } from '@/shared/composables/useConfirm';
import { useServiceCategoryStore } from '../stores/service-category.store';
import CategoryForm from '../components/CategoryForm.vue';
import ServiceCategoryDetailDialog from '../components/ServiceCategoryDetailDialog.vue';
import type { ServiceCategory, CreateServiceCategoryDTO } from '../types/service-category.types';

const categoryStore = useServiceCategoryStore();
const notification = useNotification();
const { confirm } = useConfirm();

const showForm = ref(false);
const editingCategory = ref<ServiceCategory | null>(null);
const showDetail = ref(false);
const detailCategory = ref<ServiceCategory | null>(null);

onMounted(() => {
  categoryStore.fetchCategories();
});

function openCreate() {
  editingCategory.value = null;
  showForm.value = true;
}

function openEdit(category: ServiceCategory) {
  editingCategory.value = category;
  showForm.value = true;
}

function openDetail(category: ServiceCategory) {
  detailCategory.value = category;
  showDetail.value = true;
}

function closeForm() {
  showForm.value = false;
  editingCategory.value = null;
}

async function onSave(dto: CreateServiceCategoryDTO) {
  try {
    if (editingCategory.value) {
      await categoryStore.updateCategory(editingCategory.value.id, dto);
      notification.success('Categoría actualizada');
    } else {
      await categoryStore.createCategory(dto);
      notification.success('Categoría creada');
    }
    closeForm();
  } catch {
    notification.error('Error al guardar categoría');
  }
}

async function onDelete(category: ServiceCategory) {
  const ok = await confirm(`¿Eliminar la categoría "${category.name}"?`);
  if (!ok) return;
  try {
    await categoryStore.deleteCategory(category.id);
    notification.success('Categoría eliminada');
  } catch {
    notification.error('Error al eliminar categoría');
  }
}
</script>
