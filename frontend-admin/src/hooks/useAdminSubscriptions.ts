import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminSubscriptionService } from '../services/adminSubscriptionService';
import type { CreatePlanRequest, SubscriptionStatus } from '../types/admin';

// ── Plans ─────────────────────────────────────────────────────────────────────

export const useAdminPlans = () =>
  useQuery({
    queryKey: ['admin', 'plans'],
    queryFn: adminSubscriptionService.listPlans,
    staleTime: 60_000,
  });

export const useCreatePlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: CreatePlanRequest) => adminSubscriptionService.createPlan(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'plans'] });
    },
  });
};

export const useUpdatePlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, req }: { id: string; req: CreatePlanRequest }) =>
      adminSubscriptionService.updatePlan(id, req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'plans'] });
    },
  });
};

export const useDeletePlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminSubscriptionService.deletePlan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'plans'] });
    },
  });
};

// ── Subscriptions ─────────────────────────────────────────────────────────────

interface UseAdminSubscriptionsParams {
  page?: number;
  size?: number;
  planId?: string;
  status?: SubscriptionStatus;
}

export const useAdminSubscriptions = (params: UseAdminSubscriptionsParams = {}) =>
  useQuery({
    queryKey: ['admin', 'subscriptions', params],
    queryFn: () => adminSubscriptionService.listSubscriptions(params),
    staleTime: 30_000,
  });
