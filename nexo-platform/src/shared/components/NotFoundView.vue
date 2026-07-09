<template>
  <v-empty-state
    title="Página no encontrada"
    text="La página que buscas no existe o ha sido movida."
    icon="mdi-file-question-outline"
  >
    <template #actions>
      <v-btn color="primary" to="/">Ir al Dashboard</v-btn>
    </template>
  </v-empty-state>
</template>
