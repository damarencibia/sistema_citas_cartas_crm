import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { router } from './router';
import { vuetify } from './plugins/vuetify';
import { i18n } from './i18n';
import { useAuthStore } from '@/shared/stores/auth.store';
import { useTenantStore } from '@/shared/stores/tenant.store';
import '@mdi/font/css/materialdesignicons.css';
import '@/assets/styles/main.scss';

async function bootstrap() {
  const app = createApp(App);

  app.use(createPinia());
  app.use(router);
  app.use(vuetify);
  app.use(i18n);

  const authStore = useAuthStore();
  await authStore.initialize();

  const tenantStore = useTenantStore();
  if (authStore.user?.tenant_id) {
    await tenantStore.fetchTenant(authStore.user.tenant_id);
  }

  app.mount('#app');
}

bootstrap();
