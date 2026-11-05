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
        <!-- LoginCard (glass) -->
        <article class="card glass login-card">
          <header class="login-head">
            <span class="brand">{{ content.brand }}</span>
            <router-link class="signup" to="/auth/register">
              {{ content.signUp }}
            </router-link>
          </header>

          <form class="login-form" novalidate @submit.prevent="onSubmit">
            <h1 class="login-title">{{ content.title }}</h1>
            <p class="login-sub">{{ content.subtitle }}</p>

            <p v-if="authError" class="auth-alert" role="alert">{{ authError }}</p>

            <div class="field">
              <label class="field-label" for="login-email">{{ content.labels.email }}</label>
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
                  id="login-email"
                  ref="emailInputRef"
                  v-model="form.email"
                  class="input"
                  type="email"
                  :placeholder="content.placeholders.email"
                  autocomplete="email"
                  :aria-invalid="errors.email ? 'true' : undefined"
                  aria-describedby="login-email-error"
                >
              </div>
              <p v-if="errors.email" id="login-email-error" class="field-error">{{ errors.email }}</p>
            </div>

            <div class="field">
              <label class="field-label" for="login-password">{{ content.labels.password }}</label>
              <div class="input-wrap has-chip" :class="{ 'is-error': !!errors.password }">
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
                  id="login-password"
                  v-model="form.password"
                  class="input"
                  type="password"
                  :placeholder="content.placeholders.password"
                  autocomplete="current-password"
                  :aria-invalid="errors.password ? 'true' : undefined"
                  aria-describedby="login-password-error"
                >
                <router-link class="chip-forgot" to="/auth/forgot-password">
                  {{ content.forgot }}
                </router-link>
              </div>
              <p v-if="errors.password" id="login-password-error" class="field-error">{{ errors.password }}</p>
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
          <router-link class="discover" to="/auth/register">
            {{ content.discover }}
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M2 8h11M9.5 4.5 13 8l-3.5 3.5"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </router-link>
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
    /** False = variante Storybook "sin mock": solo gradiente cálido, sin imagen de fondo. */
    mockBackground?: boolean;
  }>(),
  { loading: false, authError: null, mockBackground: true },
);

const emit = defineEmits<{
  (e: 'submit', payload: { email: string; password: string }): void;
}>();

const { t } = useI18n();

// Único objeto de contenido (localizado) — contrato del design prompt.
const content = computed(() => ({
  brand: t('auth.loginScene.brand'),
  signUp: t('auth.loginScene.signUp'),
  title: t('auth.loginScene.title'),
  subtitle: t('auth.loginScene.subtitle'),
  labels: {
    email: t('auth.loginScene.labels.email'),
    password: t('auth.loginScene.labels.password'),
  },
  placeholders: {
    email: t('auth.loginScene.placeholders.email'),
    password: t('auth.loginScene.placeholders.password'),
  },
  forgot: t('auth.loginScene.forgot'),
  legal: t('auth.loginScene.legal'),
  footnote: t('auth.loginScene.footnote'),
  promoTitle: t('auth.loginScene.promoTitle'),
  promoSub: t('auth.loginScene.promoSub'),
  discover: t('auth.loginScene.discover'),
  submitLabel: t('auth.loginScene.submitLabel'),
  errors: {
    required: t('auth.loginScene.errors.required'),
    email: t('auth.loginScene.errors.email'),
  },
}));

const form = reactive({ email: '', password: '' });
const errors = reactive({ email: null as string | null, password: null as string | null });
const emailInputRef = ref<HTMLInputElement | null>(null);

function validate(): boolean {
  const trimmed = form.email.trim();
  if (!trimmed) {
    errors.email = content.value.errors.required;
  } else {
    errors.email = emailSchema.safeParse(trimmed).success ? null : content.value.errors.email;
  }
  errors.password = form.password ? null : content.value.errors.required;
  return !errors.email && !errors.password;
}

function onSubmit() {
  if (props.loading) return;
  if (!validate()) {
    void nextTick(() => emailInputRef.value?.focus());
    return;
  }
  emit('submit', { email: form.email.trim(), password: form.password });
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
   LoginCard
   ============================================================ */
.login-card {
  padding: 20px;
}

.login-head {
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

.signup,
.chip-forgot,
.discover,
.submit-btn {
  transition:
    transform var(--motion),
    box-shadow var(--motion),
    opacity var(--motion);
}

.signup,
.chip-forgot,
.discover {
  &:hover {
    transform: translateY(-1px);
  }

  &:active {
    transform: scale(0.97);
  }
}

.signup {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-soft);
  text-decoration: none;
}

.login-title {
  margin: 0 0 4px;
  font-size: 22px;
  font-weight: 700;
  line-height: 1.25;
}

.login-sub {
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

  &.has-chip .input {
    padding-right: 86px;
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

.chip-forgot {
  position: absolute;
  right: 6px;
  display: inline-flex;
  align-items: center;
  height: 32px;
  padding: 0 12px;
  border-radius: var(--radius-pill);
  background: var(--chip-fill);
  color: var(--ink-soft);
  font-size: 12px;
  font-weight: 600;
  text-decoration: none;
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

.discover {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  align-self: flex-start;
  margin-top: 2px;
  font-size: 13px;
  font-weight: 600;
  color: var(--paper);
  text-decoration: none;

  svg {
    width: 14px;
    height: 14px;
  }
}

/* ============================================================
   Anillos de foco
   ============================================================ */
.scene :focus-visible {
  outline: 2px solid var(--ink);
  outline-offset: 2px;
}

/* ============================================================
   Desktop ≥900px: columna única centrada, targets de 38px
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

  .login-card,
  .promo-card {
    padding: 24px;
  }

  .chip-forgot {
    height: 28px;
  }
}

/* ============================================================
   Animación de entrada escalonada (guardada)
   ============================================================ */
@media (prefers-reduced-motion: no-preference) {
  .login-card {
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
