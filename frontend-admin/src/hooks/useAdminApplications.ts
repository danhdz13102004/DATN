import { useQuery } from '@tanstack/react-query';
import { adminApplicationService } from '../services/adminApplicationService';
import type { ApplicationStatus } from '../types/admin';

interface UseAdminApplicationsParams {
  page?: number;
  size?: number;
  status?: ApplicationStatus;
  search?: string;
}

export const useAdminApplications = (params: UseAdminApplicationsParams = {}) => {
  return useQuery({
    queryKey: ['admin', 'applications', params],
    queryFn: () => adminApplicationService.listApplications(params),
    staleTime: 30_000,
  });
};
