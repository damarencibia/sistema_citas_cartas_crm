<template>
  <v-layout class="auth-layout">
    <v-main
      class="d-flex align-center justify-center"
      style="min-height: 100vh; background: #f8f9fb"
    >
      <v-card class="pa-8" width="480" style="border: 1px solid rgb(var(--v-border));">
        <div class="text-center mb-6">
          <v-avatar color="primary" size="48" variant="flat">
            <span class="text-white font-weight-bold text-h6">N</span>
          </v-avatar>
          <h1 class="text-h5 font-weight-semibold mt-3">Nexo Platform</h1>
          <p class="text-body-2 mt-1" style="color: var(--text-muted);">
            Sistema de gestión para pymes
          </p>
        </div>
        <router-view />
      </v-card>
    </v-main>
  </v-layout>
</template>
