import { ref } from 'vue';

export interface ConfirmOptions {
  /** Acción destructiva: estilo de alerta + botón rojo */
  danger?: boolean;
  confirmText?: string;
  cancelText?: string;
}

const visible = ref(false);
const title = ref('');
const message = ref('');
const danger = ref(false);
const confirmText = ref('Confirmar');
const cancelText = ref('Cancelar');
let resolvePromise: ((value: boolean) => void) | null = null;

export function useConfirm() {
  /**
   * Muestra el diálogo de confirmación global y resuelve `true`/`false`.
   * @param msg Mensaje principal
   * @param ttl Título (opcional)
   * @param options danger / textos personalizados (opcional)
   *
   * Firmas retrocompatibles: confirm(msg) y confirm(msg, ttl).
   */
  function confirm(msg: string, ttl = 'Confirmar', options?: ConfirmOptions): Promise<boolean> {
    title.value = ttl;
    message.value = msg;
    danger.value = options?.danger ?? false;
    confirmText.value = options?.confirmText ?? (options?.danger ? 'Sí, continuar' : 'Confirmar');
    cancelText.value = options?.cancelText ?? 'Cancelar';
    visible.value = true;
    return new Promise((resolve) => {
      resolvePromise = resolve;
    });
  }

  function onConfirm() {
    resolvePromise?.(true);
    resolvePromise = null;
    visible.value = false;
  }

  function onCancel() {
    resolvePromise?.(false);
    resolvePromise = null;
    visible.value = false;
  }

  return { visible, title, message, danger, confirmText, cancelText, confirm, onConfirm, onCancel };
}
