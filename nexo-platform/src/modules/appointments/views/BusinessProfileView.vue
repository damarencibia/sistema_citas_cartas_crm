<template>
  <div>
    <div v-if="loading" class="py-16 text-center">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <div v-else-if="notFound" class="py-16 text-center">
      <h1 class="text-h5 font-weight-bold mb-2">Negocio no encontrado</h1>
      <p class="text-body-1 text-medium-emphasis">Verifica la dirección o contacta al negocio.</p>
    </div>

    <div v-else>
      <section class="public-hero">
        <div
          class="public-blob"
          style="width: 420px; height: 420px; top: -140px; left: -120px; background: rgb(var(--v-theme-primary)); opacity: 0.25"
        />
        <div
          class="public-blob"
          style="width: 360px; height: 360px; bottom: -120px; right: -100px; background: rgb(var(--v-theme-secondary)); opacity: 0.22"
        />
        <v-container class="relative" max-width="1100">
          <div class="text-center pt-16 pb-14 px-4">
            <div class="reveal">
              <v-avatar
                v-if="tenant?.logo_url"
                :image="tenant.logo_url"
                size="96"
                class="elevation-6"
              />
              <v-avatar
                v-else
                color="primary"
                size="96"
                class="elevation-6"
              >
                <span class="text-white text-h4 font-weight-bold">{{ (tenant?.name || 'N')[0] }}</span>
              </v-avatar>
            </div>

            <h1 class="text-h3 text-md-h2 font-weight-bold mt-6 reveal reveal-delay-1">
              {{ tenant?.name }}
            </h1>

            <div class="d-flex justify-center flex-wrap ga-2 mt-6 reveal reveal-delay-3">
              <v-chip
                v-if="tenant?.address"
                variant="tonal"
                size="small"
                prepend-icon="mdi-map-marker"
              >
                {{ tenant.address }}
              </v-chip>
              <v-chip
                v-if="tenant?.phone"
                variant="tonal"
                size="small"
                prepend-icon="mdi-phone"
              >
                {{ tenant.phone }}
              </v-chip>
              <v-chip
                v-if="whatsappLink"
                variant="tonal"
                size="small"
                prepend-icon="mdi-whatsapp"
              >
                WhatsApp
              </v-chip>
            </div>

            <div class="d-flex justify-center flex-wrap ga-3 mt-8 reveal reveal-delay-4">
              <v-btn
                v-if="tenant?.modules?.appointments"
                color="primary"
                size="x-large"
                rounded="lg"
                elevation="4"
                :to="`/${slug}/booking`"
              >
                <v-icon start>mdi-calendar-check</v-icon>
                Reservar Cita
              </v-btn>
              <v-btn
                v-if="tenant?.modules?.digital_menu"
                variant="tonal"
                size="x-large"
                rounded="lg"
                :to="`/${slug}/menu`"
              >
                <v-icon start>mdi-menu</v-icon>
                Ver Menú
              </v-btn>
              <v-btn
                v-if="tenant?.modules?.crm"
                variant="outlined"
                size="x-large"
                rounded="lg"
                :to="`/${slug}/portal`"
              >
                <v-icon start>mdi-account-heart</v-icon>
                Mi Portal
              </v-btn>
            </div>

            <div v-if="stats.length" class="mx-auto mt-12" style="max-width: 720px">
              <v-card variant="outlined" class="stats-card-enter soft-shadow rounded-xl px-4 py-3 px-md-6 py-md-4">
                <div class="d-flex flex-column flex-sm-row align-center justify-space-around">
                  <template v-for="(stat, i) in stats" :key="stat.label">
                    <div
                      class="stat-enter d-flex flex-column align-center text-center py-2 px-md-8"
                      :class="`stat-delay-${i}`"
                    >
                      <div class="text-h3 font-weight-bold stat-value">
                        <span class="public-text-gradient">
                          {{ stat.count != null ? (counts[stat.label] ?? 0) : stat.value }}
                        </span>
                        <span v-if="stat.unit" class="stat-unit text-medium-emphasis">{{ stat.unit }}</span>
                      </div>
                      <div class="text-caption text-medium-emphasis mt-1">{{ stat.label }}</div>
                    </div>
                    <v-divider
                      v-if="i < stats.length - 1"
                      vertical
                      class="d-none d-sm-block align-self-stretch my-2"
                    />
                  </template>
                </div>
              </v-card>
            </div>
          </div>
        </v-container>
      </section>

      <section v-if="tenant?.description" class="py-16">
        <v-container max-width="1100">
          <div class="about-card rounded-2xl reveal">
            <div class="about-blob" />
            <v-row align="center">
              <v-col cols="12" md="7" class="pa-4 pa-md-6">
                <div class="about-badge reveal reveal-delay-1">
                  <v-icon size="16">mdi-heart</v-icon>
                  Sobre Nosotros
                </div>
                <p class="about-statement mt-5 reveal reveal-delay-2">
                  <span class="public-text-gradient about-lead">{{ aboutLead }}</span>
                  <template v-if="aboutRest">{{ aboutRest }}</template>
                </p>
                <div class="d-flex align-center ga-3 mt-6 reveal reveal-delay-3">
                  <span class="about-hairline" />
                  <span class="about-signature">{{ tenant.name }}</span>
                </div>
              </v-col>
              <v-col cols="12" md="5" class="pa-4 pa-md-6">
                <div class="d-flex flex-column align-center">
                  <div class="about-logo-wrap public-gradient mb-6 reveal reveal-delay-3">
                    <v-avatar
                      v-if="tenant?.logo_url"
                      :image="tenant.logo_url"
                      size="112"
                    />
                    <v-avatar v-else color="primary" size="112">
                      <span class="text-white text-h4 font-weight-bold">{{ (tenant?.name || 'N')[0] }}</span>
                    </v-avatar>
                  </div>
                  <div
                    v-if="stats.length"
                    class="about-stats w-100 reveal reveal-delay-4"
                    style="max-width: 320px"
                  >
                    <div
                      v-for="stat in stats"
                      :key="stat.label"
                      class="about-stat d-flex align-center justify-space-between ga-3 py-3"
                    >
                      <span class="text-body-2 text-medium-emphasis">{{ stat.label }}</span>
                      <span class="text-subtitle-1 font-weight-bold">
                        <span class="public-text-gradient">
                          {{ stat.count != null ? (counts[stat.label] ?? 0) : stat.value }}
                        </span>
                        <span v-if="stat.unit" class="about-stat-unit text-medium-emphasis">{{ stat.unit }}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </v-col>
            </v-row>
          </div>
        </v-container>
      </section>

      <v-container v-if="hasBooking" max-width="1100" class="py-16">
        <div class="text-center mb-12 reveal">
          <h2 class="text-h4 text-md-h3 font-weight-bold">¿Cómo funciona?</h2>
          <p class="text-body-1 text-medium-emphasis mt-2">Reserva tu cita en menos de un minuto.</p>
        </div>
        <v-row>
          <v-col
            v-for="(step, i) in steps"
            :key="step.title"
            cols="12"
            md="4"
            class="reveal"
            :class="`reveal-delay-${i + 1}`"
          >
            <v-card class="soft-shadow h-100 hover-lift pa-6 text-center rounded-xl">
              <v-avatar :color="`rgba(var(--v-theme-primary), 0.12)`" size="64" class="mx-auto mb-4">
                <v-icon size="28" color="primary">{{ step.icon }}</v-icon>
              </v-avatar>
              <div class="text-caption font-weight-bold text-primary mb-1">
                PASO {{ i + 1 }}
              </div>
              <h3 class="text-h6 font-weight-bold mb-1">{{ step.title }}</h3>
              <p class="text-body-2 text-medium-emphasis mb-0">{{ step.text }}</p>
            </v-card>
          </v-col>
        </v-row>
      </v-container>

      <section v-if="hasBooking && groupedServices.length" class="py-16" style="background: rgba(var(--v-theme-primary), 0.05)">
        <v-container max-width="1100">
          <div class="text-center mb-10 reveal">
            <h2 class="text-h4 text-md-h3 font-weight-bold">Nuestros Servicios</h2>
            <p class="text-body-1 text-medium-emphasis mt-2">
              Elige una categoría y encuentra el servicio perfecto.
            </p>
          </div>

          <div v-if="!selectedCategory">
            <v-row>
              <v-col
                v-for="(group, i) in groupedServices"
                :key="group.name"
                cols="12"
                sm="6"
                lg="4"
                class="reveal"
                :class="`reveal-delay-${(i % 3) + 1}`"
              >
                <v-card
                  class="soft-shadow hover-lift h-100 rounded-xl category-card"
                  @click="selectCategory(group.name)"
                >
                  <v-card-text class="pa-6">
                    <div class="d-flex align-center justify-space-between mb-4">
                      <v-avatar :color="`rgba(var(--v-theme-primary), 0.12)`" size="56">
                        <v-icon size="26" color="primary">{{ group.icon }}</v-icon>
                      </v-avatar>
                      <v-icon size="22" class="text-medium-emphasis">mdi-arrow-right</v-icon>
                    </div>
                    <div class="text-h6 font-weight-bold">{{ group.name }}</div>
                    <p v-if="group.description" class="text-body-2 text-medium-emphasis mt-1 mb-0">
                      {{ group.description }}
                    </p>
                    <div class="d-flex align-center ga-1 mt-3">
                      <v-icon size="16" class="text-medium-emphasis">mdi-spa-outline</v-icon>
                      <span class="text-caption text-medium-emphasis">
                        {{ group.services.length }}
                        {{ group.services.length === 1 ? 'servicio' : 'servicios' }}
                      </span>
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </div>

          <div v-else :key="selectedCategory" class="fade-in">
            <div class="d-flex align-center ga-2 mb-4">
              <v-btn
                icon
                variant="tonal"
                aria-label="Volver a categorías"
                @click="clearCategory"
              >
                <v-icon>mdi-arrow-left</v-icon>
              </v-btn>
              <v-icon color="primary">{{ selectedGroup?.icon }}</v-icon>
              <span class="text-h6 font-weight-bold">{{ selectedGroup?.name }}</span>
            </div>

            <v-text-field
              v-model="searchQuery"
              prepend-inner-icon="mdi-magnify"
              label="Buscar servicio..."
              variant="outlined"
              density="comfortable"
              clearable
              hide-details
              class="mb-6 category-search"
            />

            <v-row v-if="filteredServices.length">
              <v-col
                v-for="svc in filteredServices"
                :key="svc.id"
                cols="12"
                sm="6"
                lg="4"
              >
                <v-card
                  class="soft-shadow hover-lift h-100 rounded-xl overflow-hidden"
                  :to="`/${slug}/booking`"
                >
                  <div
                    v-if="svc.image_url"
                    class="service-image"
                    :style="{ backgroundImage: `url(${svc.image_url})` }"
                  />
                  <div
                    v-else
                    class="service-cover"
                    :style="{
                      backgroundImage: `linear-gradient(135deg, ${svc.color}, ${svc.color}99)`,
                    }"
                  >
                    <v-icon size="44" color="white" class="opacity-75">mdi-spa</v-icon>
                  </div>
                  <v-card-text class="pa-5">
                    <div class="text-h6 font-weight-bold">{{ svc.name }}</div>
                    <p v-if="svc.description" class="text-body-2 text-medium-emphasis mt-1 mb-0">
                      {{ svc.description }}
                    </p>
                    <div class="d-flex align-center justify-space-between mt-4">
                      <div class="d-flex align-center ga-1 text-body-2 text-medium-emphasis">
                        <v-icon size="16">mdi-clock-outline</v-icon>
                        {{ svc.duration_minutes }} min
                      </div>
                      <div class="text-subtitle-1 font-weight-bold">{{ formatPrice(svc.price) }}</div>
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
            <v-empty
              v-else
              icon="mdi-magnify-close"
              text="No hay servicios que coincidan con tu búsqueda."
            />
          </div>
        </v-container>
      </section>

      <section v-if="hasBooking && activeEmployees.length" class="py-16">
        <v-container max-width="1100">
          <div class="text-center mb-12 reveal">
            <h2 class="text-h4 text-md-h3 font-weight-bold">Nuestro Equipo</h2>
            <p class="text-body-1 text-medium-emphasis mt-2">
              Profesionales listos para atenderte.
            </p>
          </div>
          <v-row>
            <v-col
              v-for="(emp, i) in activeEmployees"
              :key="emp.id"
              cols="6"
              md="3"
              class="reveal"
              :class="`reveal-delay-${(i % 4) + 1}`"
            >
              <v-card class="soft-shadow hover-lift pa-5 text-center rounded-xl h-100">
                <v-avatar :color="emp.color" size="72" class="mx-auto mb-3">
                  <span class="text-white text-h6 font-weight-bold">{{ initials(emp) }}</span>
                </v-avatar>
                <div class="text-subtitle-1 font-weight-bold">
                  {{ emp.first_name }} {{ emp.last_name }}
                </div>
                <div class="text-caption text-medium-emphasis mt-1">{{ emp.role || 'Especialista' }}</div>
                <div v-if="emp.email" class="text-caption text-medium-emphasis mt-1">{{ emp.email }}</div>
              </v-card>
            </v-col>
          </v-row>
        </v-container>
      </section>

      <section v-if="hasBooking" class="pb-16 px-4">
        <v-container max-width="900">
          <v-card class="public-gradient rounded-2xl pa-8 text-center reveal">
            <h2 class="text-h4 font-weight-bold text-white">¿Listo para reservar?</h2>
            <p class="text-white opacity-80 mt-2 mb-0">
              Agenda tu cita ahora y ocúpate de lo que realmente importa.
            </p>
            <v-btn
              color="white"
              size="x-large"
              rounded="lg"
              variant="flat"
              class="mt-6 text-primary font-weight-bold"
              :to="`/${slug}/booking`"
            >
              <v-icon start>mdi-calendar-check</v-icon>
              Reservar Cita
            </v-btn>
          </v-card>
        </v-container>
      </section>

      <footer class="py-10" style="border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity))">
        <v-container max-width="1100">
          <div class="d-flex flex-column flex-md-row align-center ga-4">
            <div class="d-flex align-center ga-2">
              <v-avatar v-if="tenant?.logo_url" :image="tenant.logo_url" size="32" />
              <v-avatar v-else color="primary" size="32">
                <span class="text-white text-body-2 font-weight-bold">{{ (tenant?.name || 'N')[0] }}</span>
              </v-avatar>
              <span class="font-weight-bold">{{ tenant?.name }}</span>
            </div>
            <v-spacer />
            <div class="d-flex flex-wrap justify-center ga-3 text-body-2 text-medium-emphasis">
              <span v-if="tenant?.address" class="d-flex align-center ga-1">
                <v-icon size="16">mdi-map-marker</v-icon>{{ tenant.address }}
              </span>
              <a
                v-if="tenant?.phone"
                :href="`tel:${tenant.phone}`"
                class="d-flex align-center ga-1 text-decoration-none"
              >
                <v-icon size="16">mdi-phone</v-icon>{{ tenant.phone }}
              </a>
              <a
                v-if="whatsappLink"
                :href="whatsappLink"
                target="_blank"
                rel="noopener"
                class="d-flex align-center ga-1 text-decoration-none"
              >
                <v-icon size="16">mdi-whatsapp</v-icon>WhatsApp
              </a>
            </div>
          </div>
        </v-container>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import { useTenantStore } from '@/shared/stores/tenant.store';
import { useServiceStore } from '../stores/service.store';
import { useEmployeeStore } from '../stores/employee.store';
import { useServiceCategoryStore } from '../stores/service-category.store';
import { useReveal } from '@/shared/composables/useReveal';
import type { Employee } from '../types/employee.types';

const route = useRoute();
const tenantStore = useTenantStore();
const serviceStore = useServiceStore();
const employeeStore = useEmployeeStore();
const categoryStore = useServiceCategoryStore();
const { observeReveal } = useReveal();

const slug = computed(() => route.params.slug as string);
const tenant = computed(() => tenantStore.tenant);

const loading = ref(false);
const notFound = ref(false);

const hasBooking = computed(() => !!tenant.value?.modules?.appointments);
const activeServices = computed(() => serviceStore.services.filter((s) => s.is_active));
const activeEmployees = computed(() => employeeStore.activeEmployees);

const aboutWords = computed(() => (tenant.value?.description ?? '').trim().split(/\s+/));
const aboutLead = computed(() => aboutWords.value.slice(0, 4).join(' '));
const aboutRest = computed(() => {
  const rest = aboutWords.value.slice(4).join(' ');
  return rest ? ` ${rest}` : '';
});

const whatsappLink = computed(() => {
  const digits = (tenant.value?.phone || '').replace(/\D/g, '');
  return digits ? `https://wa.me/${digits}` : '';
});

const steps = [
  { icon: 'mdi-spa-outline', title: 'Elige tu servicio', text: 'Explora el catálogo y encuentra lo que necesitas.' },
  { icon: 'mdi-calendar-check-outline', title: 'Elige fecha y hora', text: 'Selecciona el momento que mejor te acomode.' },
  { icon: 'mdi-check-decagram', title: 'Confirma en segundos', text: 'Recibe tu confirmación y listo, ¡nos vemos!' },
];

const counts = reactive<Record<string, number>>({});
let countersStarted = false;

const stats = computed(() => {
  const list: { label: string; value: string; count?: number; unit?: string }[] = [];
  if (activeServices.value.length) {
    list.push({
      label: 'Servicios',
      value: String(activeServices.value.length),
      count: activeServices.value.length,
    });
  }
  if (activeEmployees.value.length) {
    list.push({
      label: 'Especialistas',
      value: String(activeEmployees.value.length),
      count: activeEmployees.value.length,
    });
  }
  if (activeServices.value.length) {
    const minutes = activeServices.value.map((s) => s.duration_minutes);
    const min = Math.min(...minutes);
    const max = Math.max(...minutes);
    list.push({ label: 'Duración', value: min === max ? `${min}` : `${min}–${max}`, unit: 'min' });
  }
  return list;
});

function startCounters() {
  if (countersStarted) return;
  countersStarted = true;
  for (const stat of stats.value) {
    if (stat.count == null) continue;
    counts[stat.label] = 0;
    const start = performance.now();
    const duration = 1100;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      counts[stat.label] = Math.round(eased * (stat.count ?? 0));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
}

const selectedCategory = ref<string | null>(null);
const searchQuery = ref('');

const groupedServices = computed(() => {
  const groups = new Map<
    string,
    {
      name: string;
      icon: string;
      description: string | null;
      services: typeof activeServices.value;
    }
  >();
  for (const svc of activeServices.value) {
    const name = svc.category_name || 'General';
    if (!groups.has(name)) {
      const cat = categoryStore.categories.find((c) => c.id === svc.category_id);
      groups.set(name, {
        name,
        icon: cat?.icon ?? 'mdi-tag-outline',
        description: cat?.description ?? null,
        services: [],
      });
    }
    groups.get(name)!.services.push(svc);
  }
  return Array.from(groups.values());
});

const selectedGroup = computed(
  () => groupedServices.value.find((g) => g.name === selectedCategory.value) ?? null,
);

const filteredServices = computed(() => {
  const base = selectedGroup.value?.services ?? [];
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return base;
  return base.filter(
    (s) =>
      s.name.toLowerCase().includes(q) || (s.description ?? '').toLowerCase().includes(q),
  );
});

function selectCategory(name: string) {
  selectedCategory.value = name;
  searchQuery.value = '';
}

async function clearCategory() {
  selectedCategory.value = null;
  searchQuery.value = '';
  await nextTick();
  observeReveal();
}

function formatPrice(centavos: number): string {
  return `$${(centavos / 100).toFixed(2)}`;
}

function initials(emp: Employee): string {
  return `${(emp.first_name || '')[0] ?? ''}${(emp.last_name || '')[0] ?? ''}`;
}

onMounted(async () => {
  loading.value = true;
  try {
    const t = await tenantStore.fetchTenantBySlug(slug.value);
    notFound.value = !t;
    if (t) {
      await Promise.all([
        serviceStore.fetchServices(),
        employeeStore.fetchEmployees(),
        categoryStore.fetchCategories(),
      ]);
    }
  } finally {
    loading.value = false;
    await nextTick();
    observeReveal();
    startCounters();
  }
});
</script>

<style scoped>
.about-card {
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(90% 120% at 8% 0%, rgba(var(--v-theme-primary), 0.12), transparent 55%),
    rgba(var(--v-theme-primary), 0.04);
  border: 1px solid rgba(var(--v-theme-primary), 0.15);
  padding: clamp(24px, 4vw, 48px);
}

.about-blob {
  position: absolute;
  width: 280px;
  height: 280px;
  border-radius: 50%;
  filter: blur(70px);
  background: rgb(var(--v-theme-secondary));
  opacity: 0.18;
  bottom: -110px;
  right: -70px;
  pointer-events: none;
}

.about-main {
  position: relative;
  z-index: 1;
}

.about-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 14px;
  border-radius: 999px;
  border: 1px solid rgba(var(--v-theme-primary), 0.35);
  background: rgba(var(--v-theme-primary), 0.08);
  color: rgb(var(--v-theme-primary));
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.14em;
}

.about-statement {
  font-size: clamp(1.35rem, 2.6vw, 1.9rem);
  font-weight: 600;
  line-height: 1.45;
  letter-spacing: -0.015em;
  color: rgb(var(--v-theme-on-surface));
  margin-bottom: 0;
}

.about-lead {
  white-space: pre-wrap;
}

.about-hairline {
  width: 40px;
  height: 2px;
  border-radius: 99px;
  background: rgb(var(--v-theme-primary));
  flex-shrink: 0;
}

.about-signature {
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
}

.about-logo-wrap {
  position: relative;
  padding: 12px;
  border-radius: 50%;
  box-shadow: 0 18px 50px rgba(var(--v-theme-primary), 0.35);
  line-height: 0;
}

.about-stats {
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.about-stat + .about-stat {
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.about-stat-unit {
  margin-left: 3px;
  font-size: 0.78em;
  font-weight: 600;
}

.service-cover {
  height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.service-image {
  height: 140px;
  background-size: cover;
  background-position: center;
}

.relative {
  position: relative;
}

.category-card {
  cursor: pointer;
}

.category-search {
  max-width: 420px;
}

.fade-in {
  animation: fadeIn 0.45s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(12px);
  }

  to {
    opacity: 1;
    transform: none;
  }
}

.stats-card-enter {
  opacity: 0;
  transform: translateY(16px);
  animation: statIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  animation-delay: 0.05s;
}

.stat-enter {
  opacity: 0;
  transform: translateY(20px) scale(0.94);
  animation: statIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.stat-value {
  line-height: 1.2;
}

.stat-unit {
  margin-left: 3px;
  font-size: 0.8em;
  font-weight: 600;
}

.stat-delay-0 { animation-delay: 0.25s; }
.stat-delay-1 { animation-delay: 0.5s; }
.stat-delay-2 { animation-delay: 0.75s; }

@keyframes statIn {
  to {
    opacity: 1;
    transform: none;
  }
}
</style>
