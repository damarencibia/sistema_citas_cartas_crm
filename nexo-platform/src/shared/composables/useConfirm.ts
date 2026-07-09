import { ref } from 'vue';

export function useConfirm() {
  const visible = ref(false);
  const title = ref('');
  const message = ref('');
  const resolvePromise = ref<((value: boolean) => void) | null>(null);

  function confirm(msg: string, ttl = 'Confirmar'): Promise<boolean> {
    title.value = ttl;
    message.value = msg;
    visible.value = true;
    return new Promise((resolve) => {
      resolvePromise.value = resolve;
    });
  }

  function onConfirm() {
    resolvePromise.value?.(true);
    visible.value = false;
  }

  function onCancel() {
    resolvePromise.value?.(false);
    visible.value = false;
  }

  return { visible, title, message, confirm, onConfirm, onCancel };
}
