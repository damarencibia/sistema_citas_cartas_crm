<template>
  <v-layout>
    <v-app-bar dense flat>
      <v-row class="fill-height" align="center">
        <v-col cols="auto">
          <v-img v-if="tenant?.logo_url" :src="tenant.logo_url" max-width="120" contain />
        </v-col>
        <v-col>
          <div class="text-h6 font-weight-medium">{{ tenant?.name || 'Carta Digital' }}</div>
        </v-col>
      </v-row>
    </v-app-bar>

    <v-main>
      <router-view />
    </v-main>

    <NotificationCenter />
  </v-layout>
</template>

<script setup lang="ts">
import { useTenantStore } from '@/shared/stores/tenant.store';
import NotificationCenter from '@/modules/digital-menu/components/NotificationCenter.vue';

const tenant = useTenantStore().tenant;
</script>
