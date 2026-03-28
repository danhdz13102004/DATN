import api from './api';
import type { ApiResponse } from '../types/common';
import type { Interview, InterviewFormData } from '../types/interview';

export const interviewService = {
  getInterviews: (params?: Record<string, string>) =>
    api.get<ApiResponse<Interview[]>>('/company/interviews', { params }),

  getInterviewDetail: (id: string) =>
    api.get<ApiResponse<Interview>>(`/company/interviews/${id}`),

  createInterview: (data: InterviewFormData) =>
    api.post<ApiResponse<Interview>>('/company/interviews', data),

  updateInterview: (id: string, data: InterviewFormData) =>
    api.put<ApiResponse<Interview>>(`/company/interviews/${id}`, data),

  updateStatus: (id: string, status: string) =>
    api.patch<ApiResponse<null>>(`/company/interviews/${id}/status`, { status }),
};
