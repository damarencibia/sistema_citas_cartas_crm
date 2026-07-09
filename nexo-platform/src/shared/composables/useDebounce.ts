import { ref, onUnmounted } from 'vue';

export function useDebounce<T extends (...args: any[]) => any>(fn: T, delay = 300) {
  const timeoutId = ref<ReturnType<typeof setTimeout>>();

  function debouncedFn(...args: Parameters<T>) {
    clearTimeout(timeoutId.value);
    timeoutId.value = setTimeout(() => fn(...args), delay);
  }

  onUnmounted(() => {
    clearTimeout(timeoutId.value);
  });

  return debouncedFn;
}
