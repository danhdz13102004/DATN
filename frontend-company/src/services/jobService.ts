import api from './api';
import type { ApiResponse } from '../types/common';
import type { Industry, Job, JobFormData, JobSelectOption, Skill } from '../types/job';

export const jobService = {
  getCompanyJobs: (params?: Record<string, string>) =>
    api.get<ApiResponse<Job[]>>('/company/jobs', { params }),

  getJobDetail: (id: string) =>
    api.get<ApiResponse<Job>>(`/jobs/${id}`),

  createJob: (data: JobFormData) =>
    api.post<ApiResponse<Job>>('/company/jobs', data),

  updateJob: (id: string, data: JobFormData) =>
    api.put<ApiResponse<Job>>(`/company/jobs/${id}`, data),

  deleteJob: (id: string) =>
    api.delete<ApiResponse<null>>(`/company/jobs/${id}`),

  changeStatus: (id: string, status: string) =>
    api.patch<ApiResponse<null>>(`/company/jobs/${id}/status`, { status }),

  getSelectOptions: () =>
    api.get<ApiResponse<JobSelectOption[]>>('/company/jobs/select-options'),
};

export const skillService = {
  getSkills: () =>
    api.get<ApiResponse<Skill[]>>('/skills'),
};

export const industryService = {
  getIndustries: () =>
    api.get<ApiResponse<Industry[]>>('/industries'),
};
