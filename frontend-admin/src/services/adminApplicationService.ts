import api from './api';
import type { AdminApplication, ApplicationStatus, PaginationMeta } from '../types/admin';

interface ListApplicationsParams {
  page?: number;
  size?: number;
  status?: ApplicationStatus;
  search?: string;
}

interface ApplicationsResponse {
  data: AdminApplication[];
  meta: PaginationMeta;
}

export const adminApplicationService = {
  listApplications: async (params: ListApplicationsParams = {}): Promise<ApplicationsResponse> => {
    const { page = 1, size = 20, status, search } = params;
    const query = new URLSearchParams({ page: String(page), size: String(size) });
    if (status) query.append('status', status);
    if (search) query.append('search', search);
    const res = await api.get<{ data: AdminApplication[]; meta: PaginationMeta }>(`/admin/applications?${query}`);
    return { data: res.data.data, meta: res.data.meta };
  },
};
