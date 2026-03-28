import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '../services/dashboardService';

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: async () => {
      const { data } = await dashboardService.getStats();
      return data.data;
    },
  });
}

export function useRecentApplications() {
  return useQuery({
    queryKey: ['dashboard', 'recent-applications'],
    queryFn: async () => {
      const { data } = await dashboardService.getRecentApplications();
      return data.data;
    },
  });
}
