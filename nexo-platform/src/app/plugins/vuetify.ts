import 'vuetify/styles';
import { createVuetify } from 'vuetify';
import { aliases, mdi } from 'vuetify/iconsets/mdi';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';

const supabaseLight = {
  dark: false,
  colors: {
    background: '#f8f9fb',
    surface: '#ffffff',
    'surface-bright': '#f5f5f5',
    'surface-variant': '#eeeeee',
    primary: '#3ecf8e',
    'primary-darken': '#207a42',
    secondary: '#6b7280',
    error: '#dc5454',
    info: '#3b82f6',
    success: '#3ecf8e',
    warning: '#e8a800',
  },
};

const supabaseDark = {
  dark: true,
  colors: {
    background: '#1c1c1c',
    surface: '#2a2a2a',
    'surface-bright': '#333333',
    'surface-variant': '#383838',
    primary: '#3ecf8e',
    'primary-darken': '#207a42',
    secondary: '#9ca3af',
    error: '#dc5454',
    info: '#3b82f6',
    success: '#3ecf8e',
    warning: '#e8a800',
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
      light: supabaseLight,
      dark: supabaseDark,
    },
  },
  defaults: {
    VBtn: { variant: 'flat', rounded: 'md' },
    VCard: { rounded: 'md', elevation: 0, border: true },
    VTextField: { variant: 'outlined', density: 'comfortable', color: 'primary' },
    VSelect: { variant: 'outlined', density: 'comfortable', color: 'primary' },
    VTextarea: { variant: 'outlined', density: 'comfortable', color: 'primary' },
    VAutocomplete: { variant: 'outlined', density: 'comfortable', color: 'primary' },
    VCombobox: { variant: 'outlined', density: 'comfortable', color: 'primary' },
    VDialog: { maxWidth: '600', scrollable: true },
    VSheet: { rounded: 'md' },
    VChip: { rounded: 'md' },
    VListItem: { rounded: 'md' },
    VExpansionPanel: { rounded: 'md' },
    VTab: { rounded: 'md' },
    VAlert: { rounded: 'md' },
    VMenu: { rounded: 'md' },
    VTooltip: { rounded: 'md' },
    VBanner: { rounded: 'md' },
    VSnackbar: { rounded: 'md' },
  },
});

export function applyTenantTheme(colors: { primary?: string; secondary?: string }) {
  const theme = vuetify.theme;
  if (colors.primary) theme.themes.value.supabaseLight.colors.primary = colors.primary;
  if (colors.secondary) theme.themes.value.supabaseLight.colors.secondary = colors.secondary;
  if (colors.primary) theme.themes.value.supabaseDark.colors.primary = colors.primary;
  if (colors.secondary) theme.themes.value.supabaseDark.colors.secondary = colors.secondary;
}
