<template>
  <div>
    <PageHeader title="Categorías" subtitle="Administra las categorías de tu carta">
      <template #actions>
        <v-btn color="primary" @click="openDialog = true">
          <v-icon start>mdi-plus</v-icon>
          Nueva categoría
        </v-btn>
      </template>
    </PageHeader>

    <v-card>
      <DataTable :items="categories" :total="categories.length" :loading="loading" :headers="headers">
        <template #item.is_active="{ item }">
          <v-chip :color="item.is_active ? 'success' : 'grey'" small>
            {{ item.is_active ? 'Activa' : 'Inactiva' }}
          </v-chip>
        </template>
      </DataTable>
    </v-card>

    <v-dialog v-model="openDialog" width="520">
      <v-card>
        <v-card-title>{{ editingCategory ? 'Editar categoría' : 'Nueva categoría' }}</v-card-title>
        <v-card-text>
          <v-form ref="formRef" lazy-validation>
            <v-text-field v-model="form.name" label="Nombre" required class="mb-4" />
            <v-text-field v-model="form.description" label="Descripción" class="mb-4" />
            <v-text-field v-model.number="form.sort_order" type="number" label="Orden" class="mb-4" />
            <v-switch v-model="form.is_active" label="Activo" class="mb-4" />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="closeDialog">Cancelar</v-btn>
          <v-btn color="primary" @click="saveCategory">Guardar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import PageHeader from '@/shared/components/PageHeader.vue';
import DataTable from '@/shared/components/DataTable.vue';
import { useCategoryStore } from '../stores/category.store';
import { useAuthStore } from '@/shared/stores/auth.store';
import type { Category } from '../types/category.types';

const categoryStore = useCategoryStore();
const openDialog = ref(false);
const formRef = ref();
const editingCategory = ref<Category | null>(null);

const form = reactive({
  name: '',
  description: '',
  sort_order: 0,
  is_active: true,
});

const headers = [
  { title: 'Nombre', key: 'name' },
  { title: 'Descripción', key: 'description' },
  { title: 'Orden', key: 'sort_order' },
  { title: 'Estado', key: 'is_active' },
];

const categories = categoryStore.categories;
const loading = categoryStore.loading;

onMounted(async () => {
  await categoryStore.fetchCategories();
});

function resetForm() {
  editingCategory.value = null;
  form.name = '';
  form.description = '';
  form.sort_order = 0;
  form.is_active = true;
}

function closeDialog() {
  openDialog.value = false;
  resetForm();
}

const authStore = useAuthStore();

async function saveCategory() {
  if (!form.name.trim()) return;
  const tenantId = authStore.user?.tenant_id;
  if (!tenantId) return;

  if (editingCategory.value) {
    await categoryStore.updateCategory({
      id: editingCategory.value.id,
      name: form.name,
      description: form.description,
      sort_order: form.sort_order,
      is_active: form.is_active,
      tenant_id: tenantId,
      menu_id: editingCategory.value.menu_id,
    });
  } else {
    await categoryStore.createCategory({
      name: form.name,
      description: form.description || null,
      sort_order: form.sort_order,
      is_active: form.is_active,
      tenant_id: tenantId,
      menu_id: null,
    });
  }
  closeDialog();
}
</script>
