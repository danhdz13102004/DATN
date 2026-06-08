import api from './api';
import type { Job, JobFilter, SavedJobDto, InteractionEventType } from '../types/job';

export const jobService = {
  listJobs: (filters: JobFilter = {}) => {
    const params = new URLSearchParams();
    if (filters.keyword) params.set('keyword', filters.keyword);
    if (filters.jobType) params.set('jobType', filters.jobType);
    if (filters.experienceLevels?.length) {
      filters.experienceLevels.forEach(l => params.append('experienceLevels', l));
    }
    if (filters.location) params.set('location', filters.location);
    if (filters.salaryMin != null) params.set('salaryMin', String(filters.salaryMin));
    if (filters.salaryMax != null) params.set('salaryMax', String(filters.salaryMax));
    params.set('page', String((filters.page ?? 1) - 1));
    params.set('size', String(filters.size ?? 20));
    return api.get(`/jobs?${params.toString()}`).then(r => r.data);
  },

  getJobById: (id: string) => api.get<{ data: Job }>(`/jobs/${id}`).then(r => r.data.data),

  // ── Saved Jobs ─────────────────────────────────────────────────────────────

  saveJob: (jobId: string) =>
    api.post<{ data: SavedJobDto }>(`/jobs/${jobId}/save`).then(r => r.data.data),

  unsaveJob: (jobId: string) =>
    api.delete(`/jobs/${jobId}/save`).then(r => r.data),

  getSaveStatus: (jobId: string) =>
    api.get<{ data: { isSaved: boolean } }>(`/jobs/${jobId}/save/status`).then(r => r.data.data.isSaved),

  getSavedJobs: (page = 1, size = 20) =>
    api.get<{ data: SavedJobDto[]; meta: any }>(`/jobseeker/saved-jobs?page=${page - 1}&size=${size}`).then(r => r.data),

  // ── Interactions ───────────────────────────────────────────────────────────

  logInteraction: (jobId: string, eventType: InteractionEventType, resumeId?: string, metadata?: Record<string, unknown>) =>
    api.post('/jobseeker/interactions', { jobId, eventType, resumeId, metadata }).catch(() => {
      // Silent — interaction logging must never break UI
    }),

  getRecommendations: (resumeId: string, topK = 12, mode = 'resume') =>
    api.get(`/jobseeker/applications/recommendations?resumeId=${resumeId}&topK=${topK}&mode=${mode}`)
      .then(r => r.data.data as { recommendations: { job: Job; score: number }[]; meta: Record<string, unknown> }),

  getAppliedJobIds: () =>
    api.get<{ data: string[] }>(`/jobseeker/applications/applied-job-ids`)
      .then(r => (r.data.data as string[]).map(id => String(id))),
};

