import { ref, computed } from 'vue';
import type { FullProduct } from '../types/product.types';
import type { Category } from '../types/category.types';

export function useMenuDisplay(categories: Category[], products: FullProduct[]) {
  const activeCategory = ref<string | null>(categories?.[0]?.id ?? null);

  const groupedProducts = computed(() => {
    const groups = categories.map((category) => ({ category, products: [] as FullProduct[] }));
    products.forEach((product) => {
      const group = groups.find((entry) => entry.category.id === product.category_id);
      if (group) group.products.push(product);
    });
    return groups;
  });

  function selectCategory(categoryId: string) {
    activeCategory.value = categoryId;
  }

  return {
    activeCategory,
    groupedProducts,
    selectCategory,
  };
}
