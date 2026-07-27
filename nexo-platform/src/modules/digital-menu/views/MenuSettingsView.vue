<template>
  <v-container class="py-6" max-width="900">
    <v-card class="pa-6">
      <div class="d-flex justify-space-between align-center mb-4">
        <div>
          <div class="text-h6 font-weight-bold">Configuración de la Carta</div>
          <div class="text-caption text-medium-emphasis">Personaliza logo, colores y apariencia</div>
        </div>
      </div>

      <v-form ref="formRef" lazy-validation>
        <v-row>
          <v-col cols="12" md="6">
            <v-text-field v-model="name" label="Nombre del negocio" />
            <v-file-input
              label="Logo (PNG/JPG)"
              accept="image/*"
              v-model="logoFile"
              prepend-icon="mdi-image"
            />
            <div v-if="logoPreview" class="mt-3">
              <div class="text-caption mb-2">Vista previa</div>
              <v-img :src="logoPreview" max-width="200" contain />
            </div>
          </v-col>

          <v-col cols="12" md="6">
            <div class="mb-2">Color primario</div>
            <v-color-picker v-model="primaryColor" hide-canvas flat mode="hexa" />
            <div class="mt-4">Color secundario</div>
            <v-color-picker v-model="secondaryColor" hide-canvas flat mode="hexa" />
          </v-col>
        </v-row>

        <v-row class="mt-4">
          <v-col cols="12" class="d-flex justify-end">
            <v-btn color="primary" @click="onSave" :loading="saving">Guardar</v-btn>
          </v-col>
        </v-row>
      </v-form>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useTenantStore } from '@/shared/stores/tenant.store';
import { tenantRepository } from '../repositories/tenant.repository';

const tenantStore = useTenantStore();
const formRef = ref();
const saving = ref(false);

const name = ref('');
const logoFile = ref<File | null>(null);
const logoPreview = ref<string | null>(null);
const primaryColor = ref<string>('#1976D2');
const secondaryColor = ref<string>('#424242');

watch(
  () => tenantStore.tenant,
  (t) => {
    if (t) {
      name.value = t.name ?? '';
      logoPreview.value = (t as any).logo_url ?? null;
      primaryColor.value = t.primary_color ?? '#1976D2';
      secondaryColor.value = t.secondary_color ?? '#424242';
    }
  },
  { immediate: true },
);

watch(logoFile, (file) => {
  if (!file) return (logoPreview.value = tenantStore.tenant?.logo_url ?? null);
  const reader = new FileReader();
  reader.onload = () => (logoPreview.value = reader.result as string);
  reader.readAsDataURL(file);
});

async function onSave() {
  if (!tenantStore.tenant) return;
  saving.value = true;
  try {
    const updates: any = { name: name.value, primary_color: primaryColor.value, secondary_color: secondaryColor.value };
    if (logoFile.value) {
      const url = await tenantRepository.uploadLogo(tenantStore.tenant.id, logoFile.value);
      updates.logo_url = url;
    }
    await tenantStore.updateTenant(updates);
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.v-color-picker { max-width: 320px; }
</style>
