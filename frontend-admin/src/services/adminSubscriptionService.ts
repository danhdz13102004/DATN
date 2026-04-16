import api from './api';
import type {
  AdminPlan,
  AdminSubscription,
  CreatePlanRequest,
  PaginationMeta,
  SubscriptionStatus,
} from '../types/admin';

interface SubscriptionsResponse {
  data: AdminSubscription[];
  meta: PaginationMeta;
}

interface ListSubscriptionsParams {
  page?: number;
  size?: number;
  planId?: string;
  status?: SubscriptionStatus;
}

export const adminSubscriptionService = {
  // ── Plans ──────────────────────────────────────────────
  listPlans: async (): Promise<AdminPlan[]> => {
    const res = await api.get<{ data: AdminPlan[] }>('/admin/plans');
    return res.data.data;
  },

  createPlan: async (req: CreatePlanRequest): Promise<AdminPlan> => {
    const res = await api.post<{ data: AdminPlan }>('/admin/plans', req);
    return res.data.data;
  },

  updatePlan: async (id: string, req: CreatePlanRequest): Promise<AdminPlan> => {
    const res = await api.put<{ data: AdminPlan }>(`/admin/plans/${id}`, req);
    return res.data.data;
  },

  deletePlan: async (id: string): Promise<void> => {
    await api.delete(`/admin/plans/${id}`);
  },

  // ── Subscriptions ───────────────────────────────────────
  listSubscriptions: async (params: ListSubscriptionsParams = {}): Promise<SubscriptionsResponse> => {
    const { page = 1, size = 20, planId, status } = params;
    const query = new URLSearchParams({ page: String(page), size: String(size) });
    if (planId) query.append('planId', planId);
    if (status) query.append('status', status);
    const res = await api.get<{ data: AdminSubscription[]; meta: PaginationMeta }>(
      `/admin/subscriptions?${query}`
    );
    return { data: res.data.data, meta: res.data.meta };
  },
};
