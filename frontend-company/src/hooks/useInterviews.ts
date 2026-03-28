import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { interviewService } from '../services/interviewService';
import type { InterviewFormData } from '../types/interview';

export function useInterviews(filters?: Record<string, string>) {
  return useQuery({
    queryKey: ['company', 'interviews', filters],
    queryFn: async () => {
      const { data } = await interviewService.getInterviews(filters);
      return data.data;
    },
  });
}

export function useInterviewDetail(id: string) {
  return useQuery({
    queryKey: ['company', 'interviews', id],
    queryFn: async () => {
      const { data } = await interviewService.getInterviewDetail(id);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useCreateInterview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: InterviewFormData) => interviewService.createInterview(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company', 'interviews'] });
      queryClient.invalidateQueries({ queryKey: ['company', 'applications'] });
    },
  });
}

export function useUpdateInterview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: InterviewFormData }) =>
      interviewService.updateInterview(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['company', 'interviews'] });
      queryClient.invalidateQueries({ queryKey: ['company', 'interviews', variables.id] });
    },
  });
}

export function useUpdateInterviewStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      interviewService.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company', 'interviews'] });
    },
  });
}
