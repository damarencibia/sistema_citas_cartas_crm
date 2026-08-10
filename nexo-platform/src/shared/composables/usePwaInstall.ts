import { readonly, ref } from 'vue';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const canInstall = ref(false);
const isStandalone = ref(false);
let deferredPrompt: BeforeInstallPromptEvent | null = null;
let initialized = false;

function isStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function usePwaInstall() {
  if (!initialized && typeof window !== 'undefined') {
    initialized = true;
    isStandalone.value = isStandaloneMode();

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e as BeforeInstallPromptEvent;
      canInstall.value = true;
    });

    window.addEventListener('appinstalled', () => {
      deferredPrompt = null;
      canInstall.value = false;
      isStandalone.value = true;
    });
  }

  async function install(): Promise<void> {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    canInstall.value = false;
  }

  return {
    canInstall: readonly(canInstall),
    isStandalone: readonly(isStandalone),
    install,
  };
}
