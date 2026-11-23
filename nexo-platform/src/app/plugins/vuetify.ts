import 'vuetify/styles';
import { createVuetify } from 'vuetify';
import { aliases, mdi } from 'vuetify/iconsets/mdi';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';

/**
 * Nexo design system — "Premium Neutral"
 * Base: #FC4C13 (acento), #1D1D1D (tinta), #808080 (gris), #FFFFFF (superficie).
 */
const nexoLight = {
  dark: false,
  colors: {
    background: '#F7F7F8',
    surface: '#FFFFFF',
    'surface-bright': '#FAFAFA',
    'surface-variant': '#F1F1F2',
    primary: '#FC4C13',
    'primary-darken': '#C93A0C',
    secondary: '#808080',
    error: '#E5484D',
    info: '#4C7DF0',
    success: '#16A34A',
    warning: '#E8A800',
    'on-primary': '#FFFFFF',
    'on-secondary': '#FFFFFF',
    'on-background': '#1D1D1D',
    'on-surface': '#1D1D1D',
  },
};

const nexoDark = {
  dark: true,
  colors: {
    background: '#1D1D1D',
    surface: '#262626',
    'surface-bright': '#2E2E2E',
    'surface-variant': '#333333',
    primary: '#FF5C1F',
    'primary-darken': '#C93A0C',
    secondary: '#A3A3A3',
    error: '#F2555A',
    info: '#6FA0FF',
    success: '#3DDC97',
    warning: '#FBBF24',
    'on-primary': '#FFFFFF',
    'on-secondary': '#1D1D1D',
    'on-background': '#F5F5F5',
    'on-surface': '#F5F5F5',
  },
};

export const vuetify = createVuetify({
  components,
  directives,
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: { mdi },
  },
  theme: {
    defaultTheme: 'light',
    themes: {
      light: nexoLight,
      dark: nexoDark,
    },
  },
  defaults: {
    VBtn: { variant: 'flat', rounded: 'lg' },
    VCard: { rounded: 'lg', elevation: 0, border: true },
    VTextField: { variant: 'outlined', density: 'comfortable', color: 'primary' },
    VSelect: { variant: 'outlined', density: 'comfortable', color: 'primary' },
    VTextarea: { variant: 'outlined', density: 'comfortable', color: 'primary' },
    VAutocomplete: { variant: 'outlined', density: 'comfortable', color: 'primary' },
    VCombobox: { variant: 'outlined', density: 'comfortable', color: 'primary' },
    VDialog: { maxWidth: '600', scrollable: true },
    VSheet: { rounded: 'lg' },
    VChip: { rounded: 'lg' },
    VListItem: { rounded: 'lg' },
    VExpansionPanel: { rounded: 'lg' },
    VTab: { rounded: 'lg' },
    VAlert: { rounded: 'lg' },
    VMenu: { rounded: 'lg' },
    VTooltip: { rounded: 'lg' },
    VBanner: { rounded: 'lg' },
    VSnackbar: { rounded: 'lg' },
    VAvatar: { rounded: 'lg' },
  },
});

export function applyTenantTheme(colors: { primary?: string; secondary?: string }) {
  const theme = vuetify.theme;
  if (colors.primary) theme.themes.value.light.colors.primary = colors.primary;
  if (colors.secondary) theme.themes.value.light.colors.secondary = colors.secondary;
  if (colors.primary) theme.themes.value.dark.colors.primary = colors.primary;
  if (colors.secondary) theme.themes.value.dark.colors.secondary = colors.secondary;
}
