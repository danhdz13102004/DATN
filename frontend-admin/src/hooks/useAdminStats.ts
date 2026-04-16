import { useQuery } from '@tanstack/react-query';
import { adminStatsService } from '../services/adminStatsService';

export const useAdminStats = () => {
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: adminStatsService.getStats,
    staleTime: 60_000,
  });
};
