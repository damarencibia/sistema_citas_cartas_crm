export interface Pagination {
  page: number;
  perPage: number;
  total: number;
}

export interface ApiResponse<T> {
  data: T;
  error?: string;
  pagination?: Pagination;
}

export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface SelectOption {
  value: string | number;
  text: string;
}
