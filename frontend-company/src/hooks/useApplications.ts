import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { applicationService } from '../services/applicationService';

export function useApplications(filters?: Record<string, string>) {
  return useQuery({
    queryKey: ['company', 'applications', filters],
    queryFn: async () => {
      const { data } = await applicationService.getApplications(filters);
      return data;
    },
  });
}

export function useApplicationDetail(id: string) {
  return useQuery({
    queryKey: ['company', 'applications', id],
    queryFn: async () => {
      const { data } = await applicationService.getApplicationDetail(id);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useUpdateApplicationStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      applicationService.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company', 'applications'] });
    },
  });
}

export function useResumeUrl(id: string) {
  return useQuery({
    queryKey: ['company', 'applications', id, 'resume'],
    queryFn: async () => {
      const { data } = await applicationService.getResumeUrl(id);
      return data.data;
    },
    enabled: false,
  });
}

export function useApplicationSelectOptions() {
  return useQuery({
    queryKey: ['company', 'applications', 'select-options'],
    queryFn: async () => {
      const { data } = await applicationService.getSelectOptions();
      return data.data;
    },
  });
}
