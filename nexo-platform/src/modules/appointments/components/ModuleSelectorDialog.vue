<template>
  <v-dialog
    :model-value="modelValue"
    persistent
    width="640"
    no-click-animation
  >
    <template #default>
      <v-card class="module-dialog pa-6">
        <div class="text-center mb-6">
          <h2 class="text-h6 font-weight-semibold">Selecciona un módulo</h2>
          <p class="text-body-2 mt-1" style="color: var(--text-muted);">
            Elige el módulo al que deseas acceder
          </p>
        </div>

        <v-row dense>
          <v-col cols="6">
            <v-card
              :variant="selected === 'appointments' ? 'tonal' : 'outlined'"
              :color="selected === 'appointments' ? 'primary' : undefined"
              class="module-card d-flex flex-column align-center text-center justify-center pa-6"
              hover
              :style="{
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                height: '240px',
                borderWidth: selected === 'appointments' ? '2px' : '1px',
              }"
              @click="selected = 'appointments'"
              @dblclick="confirm"
            >
              <v-avatar
                :color="selected === 'appointments' ? 'primary' : 'grey-lighten-3'"
                size="64"
                class="mb-4"
                variant="tonal"
              >
                <v-icon
                  :color="selected === 'appointments' ? 'white' : 'primary'"
                  size="32"
                >
                  mdi-calendar-clock
                </v-icon>
              </v-avatar>
              <div class="text-subtitle-1 font-weight-semibold">Sistema de Citas</div>
              <div class="text-body-2 mt-1" style="color: var(--text-muted);">
                Agenda, reservas, servicios y gestión
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
              :style="{ height: '240px', opacity: 0.55 }"
            >
              <v-avatar
                color="grey-lighten-3"
                size="64"
                class="mb-4"
                variant="tonal"
              >
                <v-icon color="grey" size="32">mdi-silverware-fork-knife</v-icon>
              </v-avatar>
              <div class="text-subtitle-1 font-weight-semibold">Carta Digital</div>
              <div class="text-body-2 mt-1" style="color: var(--text-muted);">
                Menú digital, productos y pedidos
              </div>
              <div class="mt-3" style="height: 24px;">
                <v-chip
                  size="small"
                  variant="tonal"
                  color="grey"
                  class="font-weight-medium"
                >
                  Próximamente
                </v-chip>
              </div>
            </v-card>
          </v-col>
        </v-row>

        <div class="d-flex justify-center mt-5">
          <v-btn
            color="primary"
            variant="flat"
            size="large"
            :disabled="!selected"
            @click="confirm"
          >
            OK
          </v-btn>
        </div>
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
.module-dialog {
  border: none !important;
}

.module-card:hover {
  transform: translateY(-2px);
}
</style>
