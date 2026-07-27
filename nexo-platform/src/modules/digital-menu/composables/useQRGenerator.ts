import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useTenantStore } from '@/shared/stores/tenant.store';

export function useQRGenerator() {
  const route = useRoute();
  const tenantStore = useTenantStore();

  const qrUrl = computed(() => {
    const slug = route.params.slug as string | undefined;
    const table = route.query.table as string | undefined;
    if (!slug) return '';
    return `${window.location.origin}/${slug}/menu${table ? `?table=${table}` : ''}`;
  });

  return {
    qrUrl,
  };
}
