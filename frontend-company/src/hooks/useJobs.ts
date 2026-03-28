import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { jobService, skillService } from '../services/jobService';
import type { JobFormData } from '../types/job';

export function useCompanyJobs(filters?: Record<string, string>) {
  return useQuery({
    queryKey: ['company', 'jobs', filters],
    queryFn: async () => {
      const { data } = await jobService.getCompanyJobs(filters);
      return data.data;
    },
  });
}

export function useJobDetail(id: string) {
  return useQuery({
    queryKey: ['jobs', id],
    queryFn: async () => {
      const { data } = await jobService.getJobDetail(id);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useCreateJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: JobFormData) => jobService.createJob(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company', 'jobs'] });
    },
  });
}

export function useUpdateJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: JobFormData }) =>
      jobService.updateJob(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['company', 'jobs'] });
      queryClient.invalidateQueries({ queryKey: ['jobs', variables.id] });
    },
  });
}

export function useDeleteJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => jobService.deleteJob(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company', 'jobs'] });
    },
  });
}

export function useChangeJobStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      jobService.changeStatus(id, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['company', 'jobs'] });
      queryClient.invalidateQueries({ queryKey: ['jobs', variables.id] });
    },
  });
}

export function useJobSelectOptions() {
  return useQuery({
    queryKey: ['company', 'jobs', 'select-options'],
    queryFn: async () => {
      const { data } = await jobService.getSelectOptions();
      return data.data;
    },
  });
}

export function useSkills() {
  return useQuery({
    queryKey: ['skills'],
    queryFn: async () => {
      const { data } = await skillService.getSkills();
      return data.data;
    },
    staleTime: 10 * 60 * 1000,
  });
}
