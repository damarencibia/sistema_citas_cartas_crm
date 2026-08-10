import { ref } from 'vue';

const visible = ref(false);
const title = ref('');
const message = ref('');
let resolvePromise: ((value: boolean) => void) | null = null;

export function useConfirm() {
  function confirm(msg: string, ttl = 'Confirmar'): Promise<boolean> {
    title.value = ttl;
    message.value = msg;
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

  return { visible, title, message, confirm, onConfirm, onCancel };
}
