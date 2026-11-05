<template>
  <div class="scene">
    <!-- Fallback visual de fondo (mock). Variante "sin mock": prop :mock-background="false" -->
    <img
      v-if="mockBackground"
      class="scene-bg"
      src="/backgrounds/cannabis-lab.jpg"
      alt=""
      aria-hidden="true"
    >
    <span class="scene-glow" aria-hidden="true" />

    <main class="scene-grid">
      <section class="col col-left">
        <!-- RegisterCard (glass) -->
        <article class="card glass register-card">
          <header class="register-head">
            <span class="brand">{{ content.brand }}</span>
            <router-link class="login-link" to="/auth/login">
              {{ content.login }}
            </router-link>
          </header>

          <form class="register-form" novalidate @submit.prevent="onSubmit">
            <h1 class="register-title">{{ content.title }}</h1>
            <p class="register-sub">{{ content.subtitle }}</p>

            <p v-if="authError" class="auth-alert" role="alert">{{ authError }}</p>
            <p v-if="hasActiveSession" class="session-notice" role="status">
              {{ content.sessionNotice }}
            </p>

            <div class="field">
              <label class="field-label" for="register-business">{{ content.labels.businessName }}</label>
              <div class="input-wrap" :class="{ 'is-error': !!errors.businessName }">
                <svg
                  class="input-icon"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M2 5.5V13a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V5.5M6.5 14V10h3v4M1 5.5l1.2-2.4A1 1 0 0 1 3.1 2.5h9.8a1 1 0 0 1 .9.6L15 5.5M5.8 5.5h4.4"
                    stroke="currentColor"
                    stroke-width="1.4"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
                <input
                  id="register-business"
                  v-model="form.businessName"
                  class="input"
                  type="text"
                  :placeholder="content.placeholders.businessName"
                  autocomplete="organization"
                  :aria-invalid="errors.businessName ? 'true' : undefined"
                  aria-describedby="register-business-name-error"
                >
              </div>
              <p v-if="errors.businessName" id="register-business-name-error" class="field-error">
                {{ errors.businessName }}
              </p>
            </div>

            <div class="duo">
              <div class="field duo-field">
                <label class="field-label" for="register-first">{{ content.labels.firstName }}</label>
                <div class="input-wrap" :class="{ 'is-error': !!errors.firstName }">
                  <svg
                    class="input-icon"
                    viewBox="0 0 16 16"
                    fill="none"
                    aria-hidden="true"
                  >
                    <circle
                      cx="8"
                      cy="5.5"
                      r="2.8"
                      stroke="currentColor"
                      stroke-width="1.4"
                    />
                    <path
                      d="M2.8 14c.7-2.6 2.7-4 5.2-4s4.5 1.4 5.2 4"
                      stroke="currentColor"
                      stroke-width="1.4"
                      stroke-linecap="round"
                    />
                  </svg>
                  <input
                    id="register-first"
                    v-model="form.firstName"
                    class="input"
                    type="text"
                    :placeholder="content.placeholders.firstName"
                    autocomplete="given-name"
                    :aria-invalid="errors.firstName ? 'true' : undefined"
                    aria-describedby="register-first-name-error"
                  >
                </div>
                <p v-if="errors.firstName" id="register-first-name-error" class="field-error">
                  {{ errors.firstName }}
                </p>
              </div>

              <div class="field duo-field">
                <label class="field-label" for="register-last">{{ content.labels.lastName }}</label>
                <div class="input-wrap" :class="{ 'is-error': !!errors.lastName }">
                  <svg
                    class="input-icon"
                    viewBox="0 0 16 16"
                    fill="none"
                    aria-hidden="true"
                  >
                    <circle
                      cx="8"
                      cy="5.5"
                      r="2.8"
                      stroke="currentColor"
                      stroke-width="1.4"
                    />
                    <path
                      d="M2.8 14c.7-2.6 2.7-4 5.2-4s4.5 1.4 5.2 4"
                      stroke="currentColor"
                      stroke-width="1.4"
                      stroke-linecap="round"
                    />
                  </svg>
                  <input
                    id="register-last"
                    v-model="form.lastName"
                    class="input"
                    type="text"
                    :placeholder="content.placeholders.lastName"
                    autocomplete="family-name"
                    :aria-invalid="errors.lastName ? 'true' : undefined"
                    aria-describedby="register-last-name-error"
                  >
                </div>
                <p v-if="errors.lastName" id="register-last-name-error" class="field-error">
                  {{ errors.lastName }}
                </p>
              </div>
            </div>

            <div class="field">
              <label class="field-label" for="register-email">{{ content.labels.email }}</label>
              <div class="input-wrap" :class="{ 'is-error': !!errors.email }">
                <svg
                  class="input-icon"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                >
                  <rect
                    x="1.5"
                    y="3"
                    width="13"
                    height="10"
                    rx="2"
                    stroke="currentColor"
                    stroke-width="1.4"
                  />
                  <path
                    d="m2 4 6 4.5L14 4"
                    stroke="currentColor"
                    stroke-width="1.4"
                    stroke-linecap="round"
                  />
                </svg>
                <input
                  id="register-email"
                  v-model="form.email"
                  class="input"
                  type="email"
                  :placeholder="content.placeholders.email"
                  autocomplete="email"
                  :aria-invalid="errors.email ? 'true' : undefined"
                  aria-describedby="register-email-error"
                >
              </div>
              <p v-if="errors.email" id="register-email-error" class="field-error">{{ errors.email }}</p>
            </div>

            <div class="field">
              <label class="field-label" for="register-phone">{{ content.labels.phone }}</label>
              <div class="input-wrap has-prefix" :class="{ 'is-error': !!errors.phone }">
                <svg
                  class="input-icon"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M5.2 2.5 6.6 5c.2.4.1.9-.3 1.2l-1 .9c.6 1.3 2.3 3 3.6 3.6l.9-1c.3-.4.8-.5 1.2-.3l2.5 1.4c.5.3.6.9.3 1.4l-.8 1.2c-.4.6-1.1.9-1.8.7-3-.8-5.9-3.2-7.4-6.3-.9-1.7-1.3-3.4-1.5-5.2L2.4 2c.1-.6.7-1.1 1.3-1.1l.7.1c.4 0 .7.3.8.5Z"
                    stroke="currentColor"
                    stroke-width="1.4"
                    stroke-linejoin="round"
                  />
                </svg>
                <span class="phone-prefix" aria-hidden="true">{{ content.phonePrefix }}</span>
                <input
                  id="register-phone"
                  ref="phoneRef"
                  v-model="form.phone"
                  class="input"
                  type="tel"
                  inputmode="numeric"
                  maxlength="8"
                  :placeholder="content.placeholders.phone"
                  autocomplete="tel-national"
                  :aria-invalid="errors.phone ? 'true' : undefined"
                  aria-describedby="register-phone-error"
                >
              </div>
              <p v-if="errors.phone" id="register-phone-error" class="field-error">{{ errors.phone }}</p>
            </div>

            <div class="duo">
              <div class="field duo-field">
                <label class="field-label" for="register-password">{{ content.labels.password }}</label>
                <div class="input-wrap" :class="{ 'is-error': !!errors.password }">
                  <svg
                    class="input-icon"
                    viewBox="0 0 16 16"
                    fill="none"
                    aria-hidden="true"
                  >
                    <rect
                      x="2.5"
                      y="7"
                      width="11"
                      height="7"
                      rx="2"
                      stroke="currentColor"
                      stroke-width="1.4"
                    />
                    <path
                      d="M5 7V5.5a3 3 0 0 1 6 0V7"
                      stroke="currentColor"
                      stroke-width="1.4"
                      stroke-linecap="round"
                    />
                  </svg>
                  <input
                    id="register-password"
                    v-model="form.password"
                    class="input"
                    type="password"
                    :placeholder="content.placeholders.password"
                    autocomplete="new-password"
                    :aria-invalid="errors.password ? 'true' : undefined"
                    aria-describedby="register-password-error"
                  >
                </div>
                <p v-if="errors.password" id="register-password-error" class="field-error">
                  {{ errors.password }}
                </p>
              </div>

              <div class="field duo-field">
                <label class="field-label" for="register-confirm">{{ content.labels.confirmPassword }}</label>
                <div class="input-wrap" :class="{ 'is-error': !!errors.confirmPassword }">
                  <svg
                    class="input-icon"
                    viewBox="0 0 16 16"
                    fill="none"
                    aria-hidden="true"
                  >
                    <rect
                      x="2.5"
                      y="7"
                      width="11"
                      height="7"
                      rx="2"
                      stroke="currentColor"
                      stroke-width="1.4"
                    />
                    <path
                      d="m5.5 10.5 1.8 1.8 3.2-3.6"
                      stroke="currentColor"
                      stroke-width="1.4"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <path
                      d="M11.4 2.8a3 3 0 0 1 0 4.2L9.9 5.4"
                      stroke="currentColor"
                      stroke-width="1.4"
                      stroke-linecap="round"
                    />
                    <path
                      d="M4.6 7.2a3 3 0 0 1 0-4.2l1.5 1.6"
                      stroke="currentColor"
                      stroke-width="1.4"
                      stroke-linecap="round"
                    />
                  </svg>
                  <input
                    id="register-confirm"
                    v-model="form.confirmPassword"
                    class="input"
                    type="password"
                    :placeholder="content.placeholders.confirmPassword"
                    autocomplete="new-password"
                    :aria-invalid="errors.confirmPassword ? 'true' : undefined"
                    aria-describedby="register-confirm-password-error"
                  >
                </div>
                <p v-if="errors.confirmPassword" id="register-confirm-password-error" class="field-error">
                  {{ errors.confirmPassword }}
                </p>
              </div>
            </div>

            <p class="legal">{{ content.legal }}</p>

            <div class="submit-row">
              <button
                type="submit"
                class="submit-btn"
                :disabled="loading"
                :aria-label="content.submitLabel"
              >
                <span v-if="loading" class="spinner" aria-hidden="true" />
                <svg
                  v-else
                  class="submit-arrow"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M2 8h11M9.5 4.5 13 8l-3.5 3.5"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </button>
            </div>
          </form>
        </article>

        <!-- PromoCard (dark) -->
        <aside class="card promo-card">
          <h2 class="promo-title">{{ content.promoTitle }}</h2>
          <p class="promo-sub">{{ content.promoSub }}</p>
        </aside>
      </section>
    </main>

    <p class="scene-footnote">{{ content.footnote }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { emailSchema } from '@/shared/utils/validators';

const props = withDefaults(
  defineProps<{
    loading?: boolean;
    authError?: string | null;
    /** True = hay sesión activa de otra cuenta (se avisará que se cerrará al registrar). */
    hasActiveSession?: boolean;
    /** False = variante Storybook "sin mock": solo gradiente cálido, sin imagen de fondo. */
    mockBackground?: boolean;
  }>(),
  { loading: false, authError: null, hasActiveSession: false, mockBackground: true },
);

const emit = defineEmits<{
  (
    e: 'submit',
    payload: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      businessName: string;
      phone: string;
    },
  ): void;
}>();

const { t } = useI18n();

// Único objeto de contenido (localizado) — mismo contrato que LoginScene.
const content = computed(() => ({
  brand: t('auth.registerScene.brand'),
  login: t('auth.registerScene.login'),
  title: t('auth.registerScene.title'),
  subtitle: t('auth.registerScene.subtitle'),
  labels: {
    businessName: t('auth.registerScene.labels.businessName'),
    firstName: t('auth.registerScene.labels.firstName'),
    lastName: t('auth.registerScene.labels.lastName'),
    email: t('auth.registerScene.labels.email'),
    phone: t('auth.registerScene.labels.phone'),
    password: t('auth.registerScene.labels.password'),
    confirmPassword: t('auth.registerScene.labels.confirmPassword'),
  },
  placeholders: {
    businessName: t('auth.registerScene.placeholders.businessName'),
    firstName: t('auth.registerScene.placeholders.firstName'),
    lastName: t('auth.registerScene.placeholders.lastName'),
    email: t('auth.registerScene.placeholders.email'),
    phone: t('auth.registerScene.placeholders.phone'),
    password: t('auth.registerScene.placeholders.password'),
    confirmPassword: t('auth.registerScene.placeholders.confirmPassword'),
  },
  phonePrefix: t('auth.registerScene.phonePrefix'),
  legal: t('auth.registerScene.legal'),
  footnote: t('auth.registerScene.footnote'),
  promoTitle: t('auth.registerScene.promoTitle'),
  promoSub: t('auth.registerScene.promoSub'),
  submitLabel: t('auth.registerScene.submitLabel'),
  sessionNotice: t('auth.registerScene.sessionNotice'),
  errors: {
    required: t('auth.registerScene.errors.required'),
    email: t('auth.registerScene.errors.email'),
    phone: t('auth.registerScene.errors.phone'),
    passwordMin: t('auth.registerScene.errors.passwordMin'),
    passwordMatch: t('auth.registerScene.errors.passwordMatch'),
  },
}));

const form = reactive({
  businessName: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
});

const errors = reactive({
  businessName: null as string | null,
  firstName: null as string | null,
  lastName: null as string | null,
  email: null as string | null,
  phone: null as string | null,
  password: null as string | null,
  confirmPassword: null as string | null,
});

// Refs de los primeros inputs, para enfocar el primer campo inválido del duo.
const businessNameRef = ref<HTMLInputElement | null>(null);
const firstNameRef = ref<HTMLInputElement | null>(null);
const lastNameRef = ref<HTMLInputElement | null>(null);
const emailRef = ref<HTMLInputElement | null>(null);
const phoneRef = ref<HTMLInputElement | null>(null);
const passwordRef = ref<HTMLInputElement | null>(null);
const confirmRef = ref<HTMLInputElement | null>(null);

const fieldOrder: Array<keyof typeof form> = [
  'businessName',
  'firstName',
  'lastName',
  'email',
  'phone',
  'password',
  'confirmPassword',
];

const refMap = {
  businessName: businessNameRef,
  firstName: firstNameRef,
  lastName: lastNameRef,
  email: emailRef,
  phone: phoneRef,
  password: passwordRef,
  confirmPassword: confirmRef,
};

function validate(): boolean {
  const rs = content.value.errors;

  errors.businessName = form.businessName.trim() ? null : rs.required;
  errors.firstName = form.firstName.trim() ? null : rs.required;
  errors.lastName = form.lastName.trim() ? null : rs.required;

  const email = form.email.trim();
  if (!email) {
    errors.email = rs.required;
  } else {
    errors.email = emailSchema.safeParse(email).success ? null : rs.email;
  }

  errors.phone = /^\d{8}$/.test(form.phone.trim()) ? null : rs.phone;

  errors.password = !form.password
    ? rs.required
    : form.password.length >= 8
      ? null
      : rs.passwordMin;

  errors.confirmPassword = !form.confirmPassword
    ? rs.required
    : form.confirmPassword === form.password
      ? null
      : rs.passwordMatch;

  return fieldOrder.every((key) => !errors[key]);
}

function onSubmit() {
  if (props.loading) return;
  if (!validate()) {
    void nextTick(() => {
      const first = fieldOrder.find((key) => errors[key]);
      if (!first) return;
      refMap[first].value?.focus();
    });
    return;
  }
  emit('submit', {
    email: form.email.trim(),
    password: form.password,
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    businessName: form.businessName.trim(),
    phone: form.phone.trim(),
  });
}
</script>

<style scoped lang="scss">
/* ============================================================
   Tokens — todo el color vive aquí (sin hex inline fuera de este bloque)
   ============================================================ */
.scene {
  --ink: #1c1712;
  --ink-soft: #4a3f33;
  --muted: #8b7d6c;
  --dark-card: #17130f;
  --dark-soft: rgba(255, 255, 255, 0.72);
  --glass-fill: rgba(255, 255, 255, 0.55);
  --glass-border: rgba(255, 255, 255, 0.6);
  --glass-fallback: rgba(255, 255, 255, 0.72);
  --paper: #ffffff;
  --cream: #f6e8d6;
  --gold: #d9b36a;
  --olive: #8c8a5e;
  --glow-tint: rgba(255, 244, 228, 0.5);
  --input-border: rgba(28, 23, 18, 0.12);
  --chip-fill: rgba(28, 23, 18, 0.06);
  --notice-fill: rgba(28, 23, 18, 0.06);
  --danger: #c2410c;
  --radius: 24px;
  --radius-pill: 999px;
  --shadow-float: 0 28px 60px -28px rgba(74, 48, 20, 0.35);
  --blur-glass: blur(18px) saturate(140%);
  --motion: 170ms ease;
  --gap-cluster: 4px;
  --tap: 44px;
  --field-h: var(--tap);
  --btn-h: var(--tap);

  background: radial-gradient(120% 90% at 30% 12%, var(--cream) 0%, var(--gold) 55%, var(--olive) 100%);
  color: var(--ink);
  font-family: inherit;
}

/* ============================================================
   Raíz full-viewport (mobile-first, portrait-friendly)
   ============================================================ */
.scene {
  position: relative;
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 28px 16px 12px;
  overflow: hidden;
}

.scene-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.scene-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(90% 70% at 28% 16%, var(--glow-tint), transparent 60%);
}

.scene-grid {
  position: relative;
  z-index: 2;
  width: 100%;
  max-width: 360px;
  display: flex;
  flex-direction: column;
  gap: var(--gap-cluster);
}

.col {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.col-left {
  gap: var(--gap-cluster);
}

.scene-footnote {
  position: relative;
  z-index: 2;
  margin-top: 20px;
  font-size: 12px;
  color: var(--muted);
  text-align: center;
}

/* ============================================================
   Tarjetas: 24px de radio + sombra flotante cálida compartida
   ============================================================ */
.card {
  border-radius: var(--radius);
  box-shadow: var(--shadow-float);
  min-height: 0;
}

.glass {
  background: var(--glass-fill);
  border: 1px solid var(--glass-border);
  backdrop-filter: var(--blur-glass);
  -webkit-backdrop-filter: var(--blur-glass);
}

@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .glass {
    background: var(--glass-fallback);
  }
}

/* ============================================================
   RegisterCard
   ============================================================ */
.register-card {
  padding: 20px;
}

.register-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
}

.brand {
  font-weight: 700;
  font-size: 16px;
  letter-spacing: 0.02em;
}

.login-link,
.submit-btn {
  transition:
    transform var(--motion),
    box-shadow var(--motion),
    opacity var(--motion);
}

.login-link {
  &:hover {
    transform: translateY(-1px);
  }

  &:active {
    transform: scale(0.97);
  }
}

.login-link {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-soft);
  text-decoration: none;
}

.register-title {
  margin: 0 0 4px;
  font-size: 22px;
  font-weight: 700;
  line-height: 1.25;
}

.register-sub {
  margin: 0 0 16px;
  font-size: 13px;
  color: var(--muted);
}

.auth-alert {
  margin: 0 0 12px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(194, 65, 12, 0.1);
  color: var(--danger);
  font-size: 13px;
}

.session-notice {
  margin: 0 0 12px;
  padding: 10px 12px;
  border-radius: 12px;
  background: var(--notice-fill);
  color: var(--ink-soft);
  font-size: 12px;
  line-height: 1.45;
}

.duo {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.duo-field {
  flex: 1;
  min-width: 0;
}

@media (min-width: 600px) {
  .duo {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
}

.field {
  margin-bottom: 12px;
}

.field-label {
  display: block;
  margin-bottom: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--ink-soft);
}

.input-wrap {
  position: relative;
  display: flex;
  align-items: center;
  height: var(--field-h);
  border-radius: var(--radius-pill);
  border: 1px solid var(--input-border);
  background: var(--paper);
  transition: border-color var(--motion);

  &:focus-within {
    border-color: var(--ink);
  }

  &.is-error {
    border-color: var(--danger);
  }

  &.has-prefix .input {
    padding-left: 66px;
  }
}

.input {
  flex: 1;
  min-width: 0;
  height: 100%;
  padding: 0 12px 0 38px;
  border: 0;
  border-radius: inherit;
  background: transparent;
  font: inherit;
  font-size: 14px;
  color: var(--ink);
  outline: none;

  &::placeholder {
    color: var(--muted);
  }
}

.input-icon {
  position: absolute;
  left: 13px;
  width: 16px;
  height: 16px;
  color: var(--muted);
  pointer-events: none;
}

.phone-prefix {
  position: absolute;
  left: 36px;
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-soft);
}

.field-error {
  margin: 6px 2px 0;
  font-size: 12px;
  color: var(--danger);
}

.legal {
  margin: 4px 0 14px;
  font-size: 11px;
  line-height: 1.45;
  color: var(--muted);
}

.submit-row {
  display: flex;
  justify-content: flex-end;
}

.submit-btn {
  width: var(--btn-h);
  height: var(--btn-h);
  display: grid;
  place-items: center;
  border: 0;
  border-radius: var(--radius-pill);
  background: var(--ink);
  color: var(--paper);
  cursor: pointer;
  box-shadow: var(--shadow-float);

  &:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  &:active:not(:disabled) {
    transform: scale(0.97);
  }

  &:disabled {
    opacity: 0.65;
    cursor: progress;
    transform: none;
  }
}

.submit-arrow {
  width: 18px;
  height: 18px;
}

.spinner {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: var(--paper);
  animation: scene-spin 0.8s linear infinite;
}

@keyframes scene-spin {
  to {
    transform: rotate(360deg);
  }
}

/* ============================================================
   PromoCard (dark)
   ============================================================ */
.promo-card {
  padding: 18px 20px;
  background: var(--dark-card);
  color: var(--paper);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.promo-title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.3;
}

.promo-sub {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--dark-soft);
}

/* ============================================================
   Anillos de foco
   ============================================================ */
.scene :focus-visible {
  outline: 2px solid var(--ink);
  outline-offset: 2px;
}

/* ============================================================
   Desktop ≥900px: columna única, targets de 38px
   ============================================================ */
@media (min-width: 900px) {
  .scene {
    --field-h: 38px;
    --btn-h: 38px;
    padding: 48px 32px 24px;
  }

  .scene-grid {
    max-width: 400px;
  }

  .register-card,
  .promo-card {
    padding: 24px;
  }
}

/* ============================================================
   Animación de entrada escalonada (guardada)
   ============================================================ */
@media (prefers-reduced-motion: no-preference) {
  .register-card {
    animation: scene-rise 0.55s cubic-bezier(0.2, 0.8, 0.2, 1) both;
  }

  .promo-card {
    animation: scene-rise 0.55s cubic-bezier(0.2, 0.8, 0.2, 1) 0.08s both;
  }

  .scene-footnote {
    animation: scene-fade 0.6s ease-out 0.16s both;
  }
}

@keyframes scene-rise {
  from {
    opacity: 0;
    transform: translateY(14px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes scene-fade {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>
