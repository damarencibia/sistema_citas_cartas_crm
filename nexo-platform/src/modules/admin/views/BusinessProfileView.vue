<template>
  <div>
    <PageHeader title="Mi Negocio" subtitle="Configuración del perfil de tu negocio">
      <template #actions>
        <v-btn color="primary" :loading="saving" @click="save">
          <v-icon start>mdi-content-save</v-icon>
          Guardar Cambios
        </v-btn>
      </template>
    </PageHeader>

    <v-row>
      <v-col cols="12" md="4">
        <v-card class="pa-6 text-center">
          <v-avatar size="120" color="primary" class="mb-4">
            <v-icon size="48" color="white">mdi-store</v-icon>
          </v-avatar>
          <v-btn variant="tonal" color="primary" class="mt-2">Cambiar Logo</v-btn>
        </v-card>
      </v-col>

      <v-col cols="12" md="8">
        <v-card class="pa-6">
          <FormSection title="Información del Negocio">
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field v-model="form.name" label="Nombre del negocio" :rules="[required]" />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field v-model="form.slug" label="Slug (URL pública)" :rules="[required]" />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field v-model="form.email" label="Email de contacto" type="email" />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field v-model="form.phone" label="Teléfono" />
              </v-col>
              <v-col cols="12">
                <v-textarea v-model="form.address" label="Dirección" rows="2" />
              </v-col>
            </v-row>
          </FormSection>
        </v-card>

        <v-card class="pa-6 mt-4">
          <FormSection title="Personalización">
            <v-row>
              <v-col cols="6">
                <v-label class="mb-2">Color Primario</v-label>
                <v-text-field v-model="form.primary_color" type="color" hide-details />
              </v-col>
              <v-col cols="6">
                <v-label class="mb-2">Color Secundario</v-label>
                <v-text-field v-model="form.secondary_color" type="color" hide-details />
              </v-col>
            </v-row>
          </FormSection>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useTenantStore } from '@/shared/stores/tenant.store';
import PageHeader from '@/shared/components/PageHeader.vue';
import FormSection from '@/shared/components/FormSection.vue';

const tenantStore = useTenantStore();
const saving = ref(false);

const form = reactive({
  name: '',
  slug: '',
  email: '',
  phone: '',
  address: '',
  primary_color: '#1976D2',
  secondary_color: '#424242',
});

function required(v: string) {
  return !!v || 'Campo requerido';
}

onMounted(() => {
  if (tenantStore.tenant) {
    form.name = tenantStore.tenant.name;
    form.slug = tenantStore.tenant.slug;
    form.email = tenantStore.tenant.email || '';
    form.phone = tenantStore.tenant.phone || '';
    form.address = tenantStore.tenant.address || '';
    form.primary_color = tenantStore.tenant.primary_color || '#1976D2';
    form.secondary_color = tenantStore.tenant.secondary_color || '#424242';
  }
});

async function save() {
  saving.value = true;
  await tenantStore.updateTenant({ ...form } as any);
  saving.value = false;
}
</script>
