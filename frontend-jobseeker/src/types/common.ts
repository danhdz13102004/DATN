export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: { code: string; message: string };
  meta?: PaginationMeta;
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: PaginationMeta;
}
