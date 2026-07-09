<template>
  <v-layout class="auth-layout">
    <v-main
      class="d-flex align-center justify-center"
      style="min-height: 100vh; background: #f5f5f5"
    >
      <v-card class="pa-8" width="480">
        <div class="text-center mb-6">
          <v-icon size="48" color="primary">mdi-handshake</v-icon>
          <h1 class="text-h5 font-weight-bold mt-2">Nexo Platform</h1>
        </div>
        <router-view />
      </v-card>
    </v-main>
  </v-layout>
</template>
