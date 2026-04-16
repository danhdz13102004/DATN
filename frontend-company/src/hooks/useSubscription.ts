import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subscriptionService } from '../services/subscriptionService';
import type { CheckoutRequest } from '../types/subscription';

const KEYS = {
  current: ['company', 'subscription', 'current'] as const,
  plans: ['company', 'subscription', 'plans'] as const,
  payments: (page: number, size: number) =>
    ['company', 'subscription', 'payments', page, size] as const,
};

export function useCurrentSubscription() {
  return useQuery({
    queryKey: KEYS.current,
    queryFn: async () => {
      const { data } = await subscriptionService.getCurrentSubscription();
      return data.data; // may be null
    },
    staleTime: 1000 * 60 * 2, // 2 min — re-fetch after Stripe redirect
  });
}

export function usePlans() {
  return useQuery({
    queryKey: KEYS.plans,
    queryFn: async () => {
      const { data } = await subscriptionService.getPlans();
      return data.data ?? [];
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function usePaymentHistory(page = 0, size = 10) {
  return useQuery({
    queryKey: KEYS.payments(page, size),
    queryFn: async () => {
      const { data } = await subscriptionService.getPaymentHistory(page, size);
      return { items: data.data ?? [], meta: data.meta };
    },
  });
}

export function useCreateCheckoutSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: CheckoutRequest) =>
      subscriptionService.createCheckoutSession(req),
    onSuccess: () => {
      // Invalidate so subscription status is refreshed after user returns
      queryClient.invalidateQueries({ queryKey: KEYS.current });
      queryClient.invalidateQueries({ queryKey: KEYS.plans });
    },
  });
}
