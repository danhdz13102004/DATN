import api from './api';
import type { Job, JobFilter } from '../types/job';

export const jobService = {
  listJobs: (filters: JobFilter = {}) => {
    const params = new URLSearchParams();
    if (filters.keyword) params.set('keyword', filters.keyword);
    if (filters.jobType) params.set('jobType', filters.jobType);
    if (filters.experienceLevels?.length) {
      filters.experienceLevels.forEach(l => params.append('experienceLevels', l));
    }
    if (filters.location) params.set('location', filters.location);
    params.set('page', String((filters.page ?? 1) - 1));
    params.set('size', String(filters.size ?? 20));
    return api.get(`/jobs?${params.toString()}`).then(r => r.data);
  },

  getJobById: (id: string) => api.get<{ data: Job }>(`/jobs/${id}`).then(r => r.data.data),
};
