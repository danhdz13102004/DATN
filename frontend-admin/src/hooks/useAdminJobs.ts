import { useQuery } from '@tanstack/react-query';
import { adminJobService } from '../services/adminJobService';
import type { JobStatus } from '../types/admin';

interface UseAdminJobsParams {
  page?: number;
  size?: number;
  status?: JobStatus;
  keyword?: string;
}

export const useAdminJobs = (params: UseAdminJobsParams = {}) => {
  return useQuery({
    queryKey: ['admin', 'jobs', params],
    queryFn: () => adminJobService.listJobs(params),
    staleTime: 30_000,
  });
};
