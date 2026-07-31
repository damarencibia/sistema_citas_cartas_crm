<template>
  <v-layout>
    <v-app-bar
      v-if="tenantStore.tenant"
      color="surface"
      elevation="0"
      border="b"
      density="compact"
    >
      <v-container max-width="1100">
        <div class="d-flex align-center w-100">
          <router-link
            :to="`/${tenantStore.tenant.slug}`"
            class="d-flex align-center ga-2 text-decoration-none text-on-surface"
          >
            <v-avatar
              v-if="tenantStore.tenant.logo_url"
              :image="tenantStore.tenant.logo_url"
              size="30"
            />
            <v-avatar v-else color="primary" size="30">
              <span class="text-white text-body-2 font-weight-bold">{{
                (tenantStore.tenant.name || 'N')[0]
              }}</span>
            </v-avatar>
            <span class="font-weight-bold text-subtitle-1">{{ tenantStore.tenant.name }}</span>
          </router-link>
          <v-spacer />
          <v-btn
            v-if="tenantStore.activeModules.appointments"
            variant="text"
            size="small"
            :to="`/${tenantStore.tenant.slug}/booking`"
          >
            Reservar
          </v-btn>
          <v-btn
            v-if="tenantStore.activeModules.digital_menu"
            variant="text"
            size="small"
            :to="`/${tenantStore.tenant.slug}/menu`"
          >
            Menú
          </v-btn>
        </div>
      </v-container>
    </v-app-bar>

    <v-main>
      <router-view />
    </v-main>
  </v-layout>
</template>

<script setup lang="ts">
import { watch, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useTenantStore } from '@/shared/stores/tenant.store';

const route = useRoute();
const tenantStore = useTenantStore();

async function loadTenant() {
  const slug = route.params.slug as string;
  if (!slug) return;
  if (tenantStore.tenant?.slug !== slug) {
    await tenantStore.fetchTenantBySlug(slug);
  }
}

onMounted(loadTenant);
watch(() => route.params.slug, loadTenant);
</script>
