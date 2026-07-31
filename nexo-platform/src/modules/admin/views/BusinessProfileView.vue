<template>
  <div>
    <PageHeader title="Mi Negocio" subtitle="Configuración del negocio y tu página pública">
      <template #actions>
        <v-btn
          color="primary"
          :loading="saving"
          :disabled="uploading"
          @click="save"
        >
          <v-icon start>mdi-content-save</v-icon>
          Guardar Cambios
        </v-btn>
      </template>
    </PageHeader>

    <v-form ref="formRef">
      <v-card class="pa-6">
        <FormSection title="Logo">
          <div class="d-flex align-center ga-6 flex-wrap">
            <v-avatar v-if="form.logo_url" :image="form.logo_url" size="120" />
            <v-avatar v-else color="primary" size="120">
              <v-icon size="48" color="white">mdi-store</v-icon>
            </v-avatar>

            <div class="flex-grow-1" style="max-width: 360px">
              <v-file-input
                v-model="logoFile"
                label="Subir logo"
                accept="image/png,image/jpeg,image/webp"
                prepend-icon="mdi-image"
                variant="outlined"
                dense
                hide-details
                @update:model-value="onLogoPicked"
              />
              <div class="text-caption text-medium-emphasis mt-2">
                PNG, JPG o WebP · máx 2 MB
              </div>
            </div>

            <v-btn
              v-if="form.logo_url"
              variant="tonal"
              color="error"
              :loading="uploading"
              @click="removeLogo"
            >
              <v-icon start>mdi-image-off</v-icon>
              Quitar logo
            </v-btn>
          </div>
        </FormSection>
      </v-card>

      <v-card class="pa-6 mt-4">
        <FormSection title="Información del Negocio">
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field v-model="form.name" label="Nombre del negocio" :rules="[required]" />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="form.slug"
                label="Slug (URL pública)"
                :rules="[required, slugRule]"
                hint="Al cambiar el slug cambia tu URL y los enlaces compartidos dejarán de funcionar"
                persistent-hint
              />
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
        <FormSection title="URL pública">
          <p class="text-body-2 text-medium-emphasis mb-3">
            Este es el enlace que compartes con tus clientes para reservar, ver el menú o el portal.
          </p>
          <div class="d-flex align-center ga-2">
            <v-text-field
              :model-value="publicUrl"
              readonly
              variant="outlined"
              density="compact"
              hide-details
              prepend-icon="mdi-link-variant"
            />
            <v-btn
              icon
              variant="tonal"
              title="Copiar URL"
              @click="copyUrl"
            >
              <v-icon>mdi-content-copy</v-icon>
            </v-btn>
            <v-btn
              color="primary"
              variant="flat"
              prepend-icon="mdi-open-in-new"
              :disabled="!publicUrl"
              @click="openPublic"
            >
              Ver página pública
            </v-btn>
          </div>
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

      <v-card class="pa-6 mt-4">
        <FormSection title="Módulos visibles en la página pública">
          <div class="d-flex flex-wrap ga-2 mb-3">
            <v-chip
              v-for="mod in modules"
              :key="mod.key"
              :color="mod.active ? 'primary' : undefined"
              variant="tonal"
              size="small"
            >
              <v-icon start size="16">{{ mod.icon }}</v-icon>
              {{ mod.name }}
              <v-icon
                v-if="mod.active"
                end
                size="16"
                color="success"
              >
                mdi-check
              </v-icon>
              <v-icon
                v-else
                end
                size="16"
                color="grey"
              >
                mdi-minus
              </v-icon>
            </v-chip>
          </div>
          <v-btn
            variant="text"
            size="small"
            prepend-icon="mdi-puzzle"
            to="/settings/modules"
          >
            Administrar módulos
          </v-btn>
        </FormSection>
      </v-card>
    </v-form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import type { VForm } from 'vuetify/components';
import { supabase } from '@/shared/api/supabase.client';
import { useTenantStore } from '@/shared/stores/tenant.store';
import { useNotification } from '@/shared/composables/useNotification';
import PageHeader from '@/shared/components/PageHeader.vue';
import FormSection from '@/shared/components/FormSection.vue';

const BUCKET = 'logos';
const MAX_SIZE = 2 * 1024 * 1024;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const tenantStore = useTenantStore();
const notify = useNotification();
const saving = ref(false);
const uploading = ref(false);
const logoFile = ref<File | null>(null);
const formRef = ref<InstanceType<typeof VForm> | null>(null);

const tenant = computed(() => tenantStore.tenant);

const form = reactive({
  name: '',
  slug: '',
  email: '',
  phone: '',
  address: '',
  logo_url: '',
  primary_color: '#1976D2',
  secondary_color: '#424242',
});

const previousLogoUrl = ref('');

const modules = computed(() => {
  const m = tenantStore.activeModules;
  return [
    { key: 'appointments', name: 'Reservas', icon: 'mdi-calendar-clock', active: m.appointments },
    { key: 'digital_menu', name: 'Carta Digital', icon: 'mdi-menu', active: m.digital_menu },
    { key: 'crm', name: 'Portal del Cliente', icon: 'mdi-account-group', active: m.crm },
  ];
});

const publicUrl = computed(() => {
  const slug = tenant.value?.slug;
  return slug ? `${window.location.origin}/${slug}` : '';
});

function required(v: string) {
  return !!v || 'Campo requerido';
}

function slugRule(v: string) {
  if (!v) return true;
  return SLUG_PATTERN.test(v) || 'Solo minúsculas, números y guiones';
}

onMounted(() => {
  if (tenant.value) {
    form.name = tenant.value.name;
    form.slug = tenant.value.slug;
    form.email = tenant.value.email || '';
    form.phone = tenant.value.phone || '';
    form.address = tenant.value.address || '';
    form.logo_url = tenant.value.logo_url || '';
    form.primary_color = tenant.value.primary_color || '#1976D2';
    form.secondary_color = tenant.value.secondary_color || '#424242';
    previousLogoUrl.value = form.logo_url;
  }
});

function storagePathFromUrl(url: string): string | null {
  const marker = `/object/public/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.slice(idx + marker.length).split('?')[0] || null;
}

async function onLogoPicked(files: File | File[] | null) {
  const file = Array.isArray(files) ? files[0] : files;
  if (!file) return;
  if (!tenant.value) return;
  if (!file.type.startsWith('image/')) {
    notify.error('El archivo debe ser una imagen');
    return;
  }
  if (file.size > MAX_SIZE) {
    notify.error('La imagen debe pesar menos de 2 MB');
    return;
  }

  uploading.value = true;
  try {
    const ext = (file.name.split('.').pop() || 'png').toLowerCase();
    const path = `${tenant.value.id}/logo-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      contentType: file.type,
    });
    if (error) throw error;

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    form.logo_url = data.publicUrl;
    notify.success('Logo subido correctamente. Recuerda guardar los cambios.');
  } catch (e: unknown) {
    notify.error(e instanceof Error ? e.message : 'Error al subir el logo');
  } finally {
    uploading.value = false;
    logoFile.value = null;
  }
}

function removeLogo() {
  form.logo_url = '';
  notify.info('Logo marcado para quitar. Guarda los cambios para aplicarlo.');
}

async function copyUrl() {
  try {
    await navigator.clipboard.writeText(publicUrl.value);
    notify.success('URL copiada al portapapeles');
  } catch {
    notify.error('No se pudo copiar la URL');
  }
}

function openPublic() {
  if (publicUrl.value) window.open(publicUrl.value, '_blank', 'noopener');
}

async function save() {
  const { valid } = await formRef.value?.validate() ?? { valid: false };
  if (!valid) {
    notify.error('Revisa los campos marcados en rojo');
    return;
  }

  saving.value = true;
  try {
    await tenantStore.updateTenant({
      name: form.name,
      slug: form.slug,
      email: form.email,
      phone: form.phone || null,
      address: form.address || null,
      logo_url: form.logo_url || null,
      primary_color: form.primary_color,
      secondary_color: form.secondary_color,
    });

    if (previousLogoUrl.value && previousLogoUrl.value !== form.logo_url) {
      const oldPath = storagePathFromUrl(previousLogoUrl.value);
      if (oldPath) {
        await supabase.storage.from(BUCKET).remove([oldPath]).catch(() => undefined);
      }
    }
    previousLogoUrl.value = form.logo_url;
    notify.success('Cambios guardados');
  } catch (e: unknown) {
    notify.error(e instanceof Error ? e.message : 'Error al guardar los cambios');
  } finally {
    saving.value = false;
  }
}
</script>
