import api from './api';
import type { InterviewStats } from '../types/interview';

export const interviewService = {
  listMyInterviews: (params: { status?: string; meetingType?: string; page?: number; size?: number } = {}) => {
    const q = new URLSearchParams();
    if (params.status) q.set('status', params.status);
    if (params.meetingType) q.set('meetingType', params.meetingType);
    q.set('page', String((params.page ?? 1) - 1));
    q.set('size', String(params.size ?? 20));
    return api.get(`/jobseeker/interviews?${q.toString()}`).then(r => r.data);
  },

  getStats: () =>
    api.get<{ data: InterviewStats }>('/jobseeker/interviews/stats').then(r => r.data.data),
};
