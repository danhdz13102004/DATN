import api from './api';
import type { ApiResponse } from '../types/common';
import type { DashboardStats, RecentApplication } from '../types/dashboard';

export const dashboardService = {
  getStats: () =>
    api.get<ApiResponse<DashboardStats>>('/company/dashboard/stats'),

  getRecentApplications: () =>
    api.get<ApiResponse<RecentApplication[]>>('/company/dashboard/recent-applications'),
};
