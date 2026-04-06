import api from './api';
import type { ApiResponse } from '../types/common';
import type { Interview, InterviewFormData } from '../types/interview';

/** Combine separate date ("YYYY-MM-DD") + time ("HH:MM") into an ISO Instant string. */
function toInstant(date: string, time: string): string {
  // new Date('YYYY-MM-DDTHH:MM') interprets as local time → correct behaviour
  return new Date(`${date}T${time}`).toISOString();
}

export const interviewService = {
  getInterviews: (params?: Record<string, string>) =>
    // Backend returns { data: { items: Interview[], stats: {...} }, meta: PaginationMeta }
    api.get<ApiResponse<{ items: Interview[]; stats: unknown }>>('/company/interviews', { params }),

  getInterviewDetail: (id: string) =>
    api.get<ApiResponse<Interview>>(`/company/interviews/${id}`),

  createInterview: (data: InterviewFormData) =>
    api.post<ApiResponse<Interview>>('/company/interviews', {
      applicationId: data.applicationId,
      scheduledTime: toInstant(data.scheduledDate, data.scheduledTime),
      meetingType: data.meetingType,
      meetingLink: data.meetingLink,
      note: data.note,
    }),

  updateInterview: (id: string, data: InterviewFormData) =>
    api.put<ApiResponse<Interview>>(`/company/interviews/${id}`, {
      // applicationId is NOT sent on update (backend UpdateInterviewRequestDto excludes it)
      scheduledTime: toInstant(data.scheduledDate, data.scheduledTime),
      meetingType: data.meetingType,
      meetingLink: data.meetingLink,
      note: data.note,
    }),

  updateStatus: (id: string, status: string) =>
    api.patch<ApiResponse<null>>(`/company/interviews/${id}/status`, { status }),
};
