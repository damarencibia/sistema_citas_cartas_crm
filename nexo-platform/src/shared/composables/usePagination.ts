import { ref } from 'vue';

interface PaginationState {
  page: number;
  perPage: number;
  total: number;
}

export function usePagination() {
  const pagination = ref<PaginationState>({
    page: 1,
    perPage: 20,
    total: 0,
  });

  const totalPages = ref(0);

  function setPage(page: number) {
    pagination.value.page = page;
  }

  function setPerPage(perPage: number) {
    pagination.value.perPage = perPage;
    pagination.value.page = 1;
  }

  function setTotal(total: number) {
    pagination.value.total = total;
    totalPages.value = Math.ceil(total / pagination.value.perPage);
  }

  function reset() {
    pagination.value = { page: 1, perPage: 20, total: 0 };
    totalPages.value = 0;
  }

  return { pagination, totalPages, setPage, setPerPage, setTotal, reset };
}
