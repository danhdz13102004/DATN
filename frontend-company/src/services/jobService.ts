import api from './api';
import type { ApiResponse } from '../types/common';
import type { Industry, Job, JobAutoFillApiResponse, JobFormData, JobSelectOption, Skill } from '../types/job';

export const jobService = {
  getCompanyJobs: (params?: Record<string, string>) =>
    api.get<ApiResponse<Job[]>>('/company/jobs', { params }),

  getJobDetail: (id: string) =>
    api.get<ApiResponse<Job>>(`/jobs/${id}`),

  createJob: (data: JobFormData, attachmentFile?: File) => {
    if (!attachmentFile) return api.post<ApiResponse<Job>>('/company/jobs', data);
    const formData = new FormData();
    formData.append('data', JSON.stringify(data));
    formData.append('attachment', attachmentFile);
    return api.post<ApiResponse<Job>>('/company/jobs', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60_000,
    });
  },

  updateJob: (id: string, data: JobFormData, attachmentFile?: File) => {
    if (!attachmentFile) return api.put<ApiResponse<Job>>(`/company/jobs/${id}`, data);
    const formData = new FormData();
    formData.append('data', JSON.stringify(data));
    formData.append('attachment', attachmentFile);
    return api.put<ApiResponse<Job>>(`/company/jobs/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60_000,
    });
  },

  deleteJob: (id: string) =>
    api.delete<ApiResponse<null>>(`/company/jobs/${id}`),

  changeStatus: (id: string, status: string) =>
    api.patch<ApiResponse<null>>(`/company/jobs/${id}/status`, { status }),

  getSelectOptions: () =>
    api.get<ApiResponse<JobSelectOption[]>>('/company/jobs/select-options'),

  autoFillFromFile: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<ApiResponse<JobAutoFillApiResponse | null>>('/company/jobs/auto-fill', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120_000,
    });
  },
};

export const skillService = {
  getSkills: () =>
    api.get<ApiResponse<Skill[]>>('/skills'),
};

export const industryService = {
  getIndustries: () =>
    api.get<ApiResponse<Industry[]>>('/industries'),
};
