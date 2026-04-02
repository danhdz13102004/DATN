import api from './api';
import type { ApplicationStats, ApplicationDetail, ApplyRequest } from '../types/application';

export const applicationService = {
  listMyApplications: (params: { status?: string; search?: string; page?: number; size?: number } = {}) => {
    const q = new URLSearchParams();
    if (params.status) q.set('status', params.status);
    if (params.search) q.set('search', params.search);
    q.set('page', String((params.page ?? 1) - 1));
    q.set('size', String(params.size ?? 20));
    return api.get(`/jobseeker/applications?${q.toString()}`).then(r => r.data);
  },

  getStats: () =>
    api.get<{ data: ApplicationStats }>('/jobseeker/applications/stats').then(r => r.data.data),

  getDetail: (id: string) =>
    api.get<{ data: ApplicationDetail }>(`/jobseeker/applications/${id}`).then(r => r.data.data),

  apply: (data: ApplyRequest) =>
    api.post('/jobseeker/applications', data).then(r => r.data),

  withdraw: (id: string) =>
    api.patch(`/jobseeker/applications/${id}/withdraw`).then(r => r.data),
};
