import api from './api';
import type { ApiResponse } from '../types/common';
import type {
  ActiveSubscription,
  CheckoutRequest,
  CheckoutResponse,
  PaymentHistory,
  Plan,
} from '../types/subscription';

export const subscriptionService = {
  /** GET /company/subscription — current subscription (nullable) */
  getCurrentSubscription: () =>
    api.get<ApiResponse<ActiveSubscription | null>>('/company/subscription'),

  /** GET /company/subscription/plans — all available plans */
  getPlans: () =>
    api.get<ApiResponse<Plan[]>>('/company/subscription/plans'),

  /** GET /company/subscription/payments?page=&size= — payment history */
  getPaymentHistory: (page = 0, size = 10) =>
    api.get<ApiResponse<PaymentHistory[]>>('/company/subscription/payments', {
      params: { page, size },
    }),

  /** POST /company/subscription/checkout — create Stripe checkout session */
  createCheckoutSession: (req: CheckoutRequest) =>
    api.post<ApiResponse<CheckoutResponse>>('/company/subscription/checkout', req),
};
