<template>
  <v-dialog
    :model-value="modelValue"
    persistent
    width="640"
    no-click-animation
  >
    <template #default>
      <v-card class="pa-6" rounded="xl">
        <div class="text-center mb-6">
          <h2 class="text-h5 font-weight-bold">Selecciona un módulo</h2>
          <p class="text-body-2 text-medium-emphasis mt-1">
            Elige el módulo al que deseas acceder
          </p>
        </div>

        <v-row dense>
          <v-col cols="6">
            <v-card
              :variant="selected === 'appointments' ? 'tonal' : 'outlined'"
              :color="selected === 'appointments' ? 'primary' : undefined"
              class="module-card d-flex flex-column align-center text-center justify-center pa-6"
              rounded="lg"
              hover
              :style="{ cursor: 'pointer', transition: 'all 0.2s ease', height: '240px' }"
              @click="selected = 'appointments'"
              @dblclick="confirm"
            >
              <v-avatar
                :color="selected === 'appointments' ? 'primary' : 'grey-lighten-3'"
                size="72"
                class="mb-4"
              >
                <v-icon
                  :color="selected === 'appointments' ? 'white' : 'primary'"
                  size="36"
                >
                  mdi-calendar-clock
                </v-icon>
              </v-avatar>
              <div class="text-subtitle-1 font-weight-bold">Sistema de Citas</div>
              <div class="text-body-2 text-medium-emphasis mt-1">
                Agenda, reservas, servicios y gestión de citas
              </div>
              <div class="mt-3" style="height: 24px;">
                <v-icon
                  v-if="selected === 'appointments'"
                  color="primary"
                  size="24"
                >
                  mdi-check-circle
                </v-icon>
              </div>
            </v-card>
          </v-col>

          <v-col cols="6">
            <v-card
              variant="outlined"
              disabled
              class="module-card d-flex flex-column align-center text-center justify-center pa-6"
              rounded="lg"
              :style="{ height: '240px', opacity: 0.55 }"
            >
              <v-avatar color="grey-lighten-3" size="72" class="mb-4">
                <v-icon color="grey" size="36">mdi-silverware-fork-knife</v-icon>
              </v-avatar>
              <div class="text-subtitle-1 font-weight-bold">Carta Digital</div>
              <div class="text-body-2 text-medium-emphasis mt-1">
                Menú digital, productos, categorías y pedidos
              </div>
              <div class="mt-3" style="height: 24px;">
                <v-chip
                  size="small"
                  variant="tonal"
                  color="grey"
                >
                  Próximamente
                </v-chip>
              </div>
            </v-card>
          </v-col>
        </v-row>

        <v-card-actions class="justify-center mt-4">
          <v-btn
            color="primary"
            variant="flat"
            size="large"
            :disabled="!selected"
            @click="confirm"
          >
            OK
          </v-btn>
        </v-card-actions>
      </v-card>
    </template>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';

defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  select: [moduleId: string];
}>();

const selected = ref<string | null>(null);

function confirm() {
  if (!selected.value) return;
  emit('select', selected.value);
  emit('update:modelValue', false);
}
</script>

<style scoped>
.module-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}
</style>
