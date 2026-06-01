export interface Plan {
  id: string;
  name: string;
  price: number;
  jobPostLimit: number;  // 0 = unlimited
  durationDays: number;
  allowUseAiMatching: boolean;
  autoFillLimit: number; // 0 = unlimited
  createdAt: string;
  activeSubscriptions: number;
}

export interface ActiveSubscription {
  subscriptionId: string;
  planId: string;
  planName: string;
  planPrice: number;
  jobPostLimit: number;
  durationDays: number;
  allowUseAiMatching: boolean;
  autoFillLimit: number;        // 0 = unlimited
  autoFillUsageCount: number;    // current usage
  startDate: string;
  endDate: string;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  jobsPostedCount: number;
}

export interface PaymentHistory {
  id: string;
  amount: number;
  currency: string;
  gateway: 'STRIPE' | 'VNPAY' | 'MOMO';
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  transactionId: string | null;
  description: string;
  createdAt: string;
}

export interface CheckoutResponse {
  sessionUrl: string;
}

export interface CheckoutRequest {
  planId: string;
  successUrl: string;
  cancelUrl: string;
}
