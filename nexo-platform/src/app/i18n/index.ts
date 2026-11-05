import { createI18n } from 'vue-i18n';
import es from './messages/es.json';
import en from './messages/en.json';
import pt from './messages/pt.json';

const userLocale = navigator.language.split('-')[0] || 'es';

export const i18n = createI18n({
  // Modo Composition: habilita el composable useI18n() en los componentes.
  legacy: false,
  locale:
    localStorage.getItem('locale') || (['es', 'en', 'pt'].includes(userLocale) ? userLocale : 'es'),
  fallbackLocale: 'es',
  messages: { es, en, pt },
});
