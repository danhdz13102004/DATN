import api from './api';
import type { AdminJob, AdminJobDetail, JobStatus, PaginationMeta } from '../types/admin';

interface ListJobsParams {
  page?: number;
  size?: number;
  status?: JobStatus;
  keyword?: string;
}

interface JobsResponse {
  data: AdminJob[];
  meta: PaginationMeta;
}

export const adminJobService = {
  listJobs: async (params: ListJobsParams = {}): Promise<JobsResponse> => {
    const { page = 1, size = 20, status, keyword } = params;
    const query = new URLSearchParams({ page: String(page), size: String(size) });
    if (status) query.append('status', status);
    if (keyword) query.append('keyword', keyword);
    const res = await api.get<{ data: AdminJob[]; meta: PaginationMeta }>(`/admin/jobs?${query}`);
    return { data: res.data.data, meta: res.data.meta };
  },

  getJob: async (id: string): Promise<AdminJobDetail> => {
    const res = await api.get<{ data: AdminJobDetail }>(`/admin/jobs/${id}`);
    return res.data.data;
  },

  deleteJob: async (id: string): Promise<void> => {
    await api.delete(`/admin/jobs/${id}`);
  },
};
