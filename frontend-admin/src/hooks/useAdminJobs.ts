import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

export const useAdminJobDetail = (id: string) => {
  return useQuery({
    queryKey: ['admin', 'jobs', id],
    queryFn: () => adminJobService.getJob(id),
    enabled: !!id,
  });
};

export const useDeleteAdminJob = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminJobService.deleteJob(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'jobs'] });
      queryClient.removeQueries({ queryKey: ['admin', 'jobs', id] });
    },
  });
};
