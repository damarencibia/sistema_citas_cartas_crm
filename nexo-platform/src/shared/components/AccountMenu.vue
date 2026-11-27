<template>
  <v-menu offset-y="4" :close-on-content-click="true">
    <template #activator="{ props: menuProps }">
      <v-btn
        v-bind="menuProps"
        icon
        size="small"
        variant="text"
        class="account-menu__trigger"
        aria-label="Abrir menú de cuenta"
      >
        <v-avatar size="28" color="surface-variant" variant="flat">
          <span class="text-on-surface-variant font-weight-medium" style="font-size: 11px;">{{ initials }}</span>
        </v-avatar>
      </v-btn>
    </template>

    <v-list
      density="compact"
      nav
      class="py-1"
      style="min-width: 210px;"
    >
      <v-list-item class="px-3 py-2">
        <div class="text-body-2 font-weight-medium">{{ authStore.userName }}</div>
        <div class="text-caption" style="color: var(--text-muted);">{{ authStore.user?.email }}</div>
      </v-list-item>
      <v-divider class="my-1" />
      <v-list-item
        prepend-icon="mdi-account-circle-outline"
        title="Mi Cuenta"
        subtitle="Cambiar contraseña"
        to="/settings/account"
        class="px-3"
      />
      <v-list-item
        v-if="authStore.isAdmin"
        prepend-icon="mdi-cog-outline"
        title="Configuración"
        to="/settings/business"
        class="px-3"
      />
      <v-divider class="my-1" />
      <v-list-item
        prepend-icon="mdi-logout"
        title="Cerrar Sesión"
        class="px-3"
        @click="handleLogout"
      />
    </v-list>
  </v-menu>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/shared/stores/auth.store';

const authStore = useAuthStore();
const router = useRouter();

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

<style scoped>
.account-menu__trigger {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
}
</style>
