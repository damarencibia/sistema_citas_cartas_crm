<template>
  <v-app-bar elevation="0" border class="px-4">
    <v-app-bar-nav-icon @click="uiStore.toggleSidebar()" />
    <v-spacer />
    <v-btn icon @click="uiStore.toggleTheme()">
      <v-icon>{{ uiStore.theme === 'light' ? 'mdi-weather-night' : 'mdi-weather-sunny' }}</v-icon>
    </v-btn>
    <v-menu>
      <template #activator="{ props }">
        <v-btn icon v-bind="props">
          <v-avatar size="36" color="primary">
            <span class="text-white text-body-2">{{ initials }}</span>
          </v-avatar>
        </v-btn>
      </template>
      <v-list density="compact" nav>
        <v-list-item
          :title="authStore.userName"
          :subtitle="authStore.user?.email"
          class="px-4 py-2"
        />
        <v-divider />
        <v-list-item prepend-icon="mdi-cog" title="Configuración" to="/settings/business" />
        <v-list-item prepend-icon="mdi-logout" title="Cerrar Sesión" @click="handleLogout" />
      </v-list>
    </v-menu>
  </v-app-bar>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/shared/stores/auth.store';
import { useUiStore } from '@/shared/stores/ui.store';

const router = useRouter();
const authStore = useAuthStore();
const uiStore = useUiStore();

const initials = computed(() => {
  const user = authStore.user;
  if (!user) return 'N';
  return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
});

async function handleLogout() {
  await authStore.logout();
  router.push('/auth/login');
}
</script>
