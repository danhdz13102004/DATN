import api from './api';
import type { DashboardStats } from '../types/jobseeker';
import type { ApplicationListItem } from '../types/application';
import type { InterviewListItem } from '../types/interview';

export const dashboardService = {
  getStats: () => api.get<{ data: DashboardStats }>('/jobseeker/dashboard/stats').then(r => r.data.data),

  getRecentApplications: () =>
    api.get<{ data: ApplicationListItem[] }>('/jobseeker/dashboard/recent-applications').then(r => r.data.data),

  getUpcomingInterviews: () =>
    api.get<{ data: InterviewListItem[] }>('/jobseeker/dashboard/upcoming-interviews').then(r => r.data.data),
};
