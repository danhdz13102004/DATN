import api from './api';
import type { ApiResponse } from '../types/common';
import type {
  Application,
  ApplicationDetail,
  ApplicationStats,
  ApplicationSelectOption,
} from '../types/application';

export const applicationService = {
  getApplications: (params?: Record<string, string>) =>
    api.get<ApiResponse<Application[]> & { stats: ApplicationStats }>('/company/applications', { params }),

  getApplicationDetail: (id: string) =>
    api.get<ApiResponse<ApplicationDetail>>(`/company/applications/${id}`),

  updateStatus: (id: string, status: string) =>
    api.patch<ApiResponse<null>>(`/company/applications/${id}/status`, { status }),

  getResumeUrl: (id: string) =>
    api.get<ApiResponse<{ url: string }>>(`/company/applications/${id}/resume`),

  getSelectOptions: () =>
    api.get<ApiResponse<ApplicationSelectOption[]>>('/company/applications/select-options'),
};
