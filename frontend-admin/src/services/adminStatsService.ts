import api from './api';
import type { AdminStats } from '../types/admin';

export const adminStatsService = {
  getStats: async (): Promise<AdminStats> => {
    const res = await api.get<{ data: AdminStats }>('/admin/stats');
    return res.data.data;
  },
};
