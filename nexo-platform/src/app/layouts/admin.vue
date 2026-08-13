<template>
  <v-layout>
    <AppSidebar />
    <AppTopbar />
    <NotificationDrawer />
    <v-main>
      <v-container fluid class="pa-6">
        <router-view />
      </v-container>
    </v-main>
  </v-layout>
</template>

<script setup lang="ts">
import AppSidebar from '@/shared/components/AppSidebar.vue';
import AppTopbar from '@/shared/components/AppTopbar.vue';
import NotificationDrawer from '@/modules/notifications/components/NotificationDrawer.vue';
</script>
