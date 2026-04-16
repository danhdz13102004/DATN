import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  useCurrentSubscription,
  useCreateCheckoutSession,
  usePaymentHistory,
  usePlans,
} from '../../hooks/useSubscription';
import type { Plan } from '../../types/subscription';

// ─────────────────────────────────────────────
// Utility helpers
// ─────────────────────────────────────────────

function formatCurrency(amount: number, currency = 'usd'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function jobLimitText(limit: number): string {
  return limit === 0 ? 'Unlimited job posts' : `${limit} job posts`;
}

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

interface AlertBannerProps {
  type: 'success' | 'cancel' | 'error';
  message: string;
  onClose: () => void;
}

function AlertBanner({ type, message, onClose }: AlertBannerProps) {
  const colors = {
    success: 'bg-green-50 border-green-200 text-green-800',
    cancel: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    error: 'bg-red-50 border-red-200 text-red-800',
  };
  const icons = {
    success: 'fas fa-check-circle text-green-500',
    cancel: 'fas fa-info-circle text-yellow-500',
    error: 'fas fa-exclamation-triangle text-red-500',
  };

  return (
    <div className={`flex items-start gap-3 p-4 mb-6 rounded-lg border ${colors[type]}`}>
      <i className={`${icons[type]} mt-0.5 flex-shrink-0`} />
      <p className="flex-1 text-sm font-medium">{message}</p>
      <button onClick={onClose} className="flex-shrink-0 opacity-60 hover:opacity-100">
        <i className="fas fa-times text-xs" />
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────
// Plan Card
// ─────────────────────────────────────────────

interface PlanCardProps {
  plan: Plan;
  isCurrent: boolean;
  isHigher: boolean;
  isLower: boolean;
  loading: boolean;
  onSelect: (plan: Plan) => void;
}

function PlanCard({ plan, isCurrent, isHigher, isLower, loading, onSelect }: PlanCardProps) {
  const features = [
    { label: jobLimitText(plan.jobPostLimit), icon: 'fas fa-briefcase' },
    { label: `${plan.durationDays} days duration`, icon: 'fas fa-calendar-alt' },
    {
      label: plan.allowUseAiMatching ? 'AI-powered matching' : 'Standard matching',
      icon: 'fas fa-robot',
    },
  ];

  return (
    <div
      className={`relative flex flex-col rounded-xl border-2 p-6 transition-shadow hover:shadow-lg
        ${isCurrent
          ? 'border-primary bg-primary/5 shadow-md'
          : 'border-gray-200 bg-white'
        }`}
    >
      {/* Current badge */}
      {isCurrent && (
        <div className="absolute -top-px left-1/2 -translate-x-1/2 bg-primary text-white
          px-4 py-1 rounded-b-lg text-xs font-semibold uppercase tracking-wide">
          Current
        </div>
      )}

      {/* Plan name & price */}
      <div className="mb-4 mt-2">
        <h3 className="text-lg font-bold text-gray-800">{plan.name}</h3>
        <div className="mt-1">
          <span className="text-3xl font-extrabold text-gray-900">
            {formatCurrency(plan.price)}
          </span>
          <span className="text-sm text-gray-500"> / {plan.durationDays} days</span>
        </div>
      </div>

      {/* Feature list */}
      <ul className="flex-1 space-y-2 mb-6">
        {features.map((f) => (
          <li key={f.label} className="flex items-center gap-2 text-sm text-gray-600">
            <i className={`${f.icon} w-4 text-primary`} />
            {f.label}
          </li>
        ))}
      </ul>

      {/* Action button */}
      {isCurrent ? (
        <button
          disabled
          className="w-full py-2.5 rounded-lg border-2 border-primary text-primary
            font-semibold opacity-60 cursor-not-allowed text-sm"
        >
          Current Plan
        </button>
      ) : isHigher ? (
        <button
          onClick={() => onSelect(plan)}
          disabled={loading}
          className="w-full py-2.5 rounded-lg bg-primary text-white font-semibold
            hover:bg-primary-dark disabled:opacity-60 disabled:cursor-not-allowed
            transition-colors text-sm"
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Processing…
            </span>
          ) : 'Upgrade'}
        </button>
      ) : isLower ? (
        <button
          onClick={() => onSelect(plan)}
          disabled={loading}
          className="w-full py-2.5 rounded-lg border-2 border-primary text-primary
            font-semibold hover:bg-primary/5 disabled:opacity-60 disabled:cursor-not-allowed
            transition-colors text-sm"
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
              Processing…
            </span>
          ) : 'Downgrade'}
        </button>
      ) : (
        <button
          onClick={() => onSelect(plan)}
          disabled={loading}
          className="w-full py-2.5 rounded-lg bg-primary text-white font-semibold
            hover:bg-primary-dark disabled:opacity-60 disabled:cursor-not-allowed
            transition-colors text-sm"
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Processing…
            </span>
          ) : 'Subscribe'}
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Gateway icon helper
// ─────────────────────────────────────────────

function GatewayIcon({ gateway }: { gateway: string }) {
  switch (gateway) {
    case 'STRIPE':
      return <><i className="fab fa-stripe-s text-indigo-500" /> Stripe</>;
    case 'VNPAY':
      return <><i className="fas fa-credit-card text-blue-500" /> VNPay</>;
    case 'MOMO':
      return <><i className="fas fa-wallet text-pink-500" /> MoMo</>;
    default:
      return <>{gateway}</>;
  }
}

// ─────────────────────────────────────────────
// Status badge
// ─────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cls: Record<string, string> = {
    SUCCESS: 'bg-green-100 text-green-700',
    PENDING: 'bg-yellow-100 text-yellow-700',
    FAILED: 'bg-red-100 text-red-700',
    ACTIVE: 'bg-green-100 text-green-700',
    EXPIRED: 'bg-gray-100 text-gray-600',
    CANCELLED: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${cls[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────

export default function SubscriptionPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [alert, setAlert] = useState<{ type: 'success' | 'cancel' | 'error'; message: string } | null>(null);
  const [checkingOutPlanId, setCheckingOutPlanId] = useState<string | null>(null);
  const [paymentPage, setPaymentPage] = useState(0);
  const alertShownRef = useRef(false);

  // Handle Stripe redirect query params
  useEffect(() => {
    if (alertShownRef.current) return;

    const paymentStatus = searchParams.get('payment');
    if (paymentStatus === 'success') {
      setAlert({
        type: 'success',
        message: 'Payment received! Your subscription will be activated shortly. This page refreshes automatically.',
      });
      alertShownRef.current = true;
      // Remove param from URL without triggering navigation
      setSearchParams({}, { replace: true });
    } else if (paymentStatus === 'cancelled') {
      setAlert({
        type: 'cancel',
        message: 'Payment was cancelled. No charges were made.',
      });
      alertShownRef.current = true;
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const { data: currentSub, isLoading: loadingSub } = useCurrentSubscription();
  const { data: plans = [], isLoading: loadingPlans } = usePlans();
  const { data: paymentData, isLoading: loadingPayments } = usePaymentHistory(paymentPage, 10);

  const checkout = useCreateCheckoutSession();

  const handleSubscribe = async (plan: Plan) => {
    setCheckingOutPlanId(plan.id);
    try {
      const origin = window.location.origin;
      const { data } = await checkout.mutateAsync({
        planId: plan.id,
        successUrl: `${origin}/subscriptions?payment=success`,
        cancelUrl: `${origin}/subscriptions?payment=cancelled`,
      });
      // Redirect to Stripe Checkout
      window.location.href = data.data.sessionUrl;
    } catch {
      setAlert({
        type: 'error',
        message: 'Failed to start checkout. Please try again.',
      });
      setCheckingOutPlanId(null);
    }
  };

  // Compute usage percentage for progress bar
  const usagePct = currentSub
    ? currentSub.jobPostLimit === 0
      ? 0
      : Math.min(100, Math.round((currentSub.jobsPostedCount / currentSub.jobPostLimit) * 100))
    : 0;

  // Build plan sort based on price to determine upgrade/downgrade
  const sortedPlans = [...plans].sort((a, b) => a.price - b.price);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Page header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Subscription &amp; Payments</h2>
        <p className="text-sm text-gray-500 mt-1">Manage your plan and view payment history</p>
      </div>

      {/* Alert banner */}
      {alert && (
        <AlertBanner
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      {/* ── Current Plan ─────────────────────────────────── */}
      <div className="bg-white rounded-xl border-l-4 border-primary shadow-sm p-6 mb-6">
        {loadingSub ? (
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-28" />
            <div className="h-7 bg-gray-200 rounded w-48" />
            <div className="h-3 bg-gray-200 rounded w-64" />
          </div>
        ) : currentSub ? (
          <>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                  Current Plan
                </p>
                <h3 className="text-2xl font-bold text-gray-800">{currentSub.planName} Plan</h3>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500">
                  <StatusBadge status={currentSub.status} />
                  <span>·</span>
                  <span>{formatDate(currentSub.startDate)} — {formatDate(currentSub.endDate)}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">
                  {currentSub.jobPostLimit === 0 ? 'Unlimited posts' : 'Job Posts Used'}
                </p>
                {currentSub.jobPostLimit > 0 && (
                  <p className="text-2xl font-bold text-primary">
                    {currentSub.jobsPostedCount} / {currentSub.jobPostLimit}
                  </p>
                )}
              </div>
            </div>
            {currentSub.jobPostLimit > 0 && (
              <div className="mt-4 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    usagePct >= 90 ? 'bg-red-500' : usagePct >= 70 ? 'bg-yellow-500' : 'bg-primary'
                  }`}
                  style={{ width: `${usagePct}%` }}
                />
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center gap-3">
            <i className="fas fa-crown text-2xl text-gray-300" />
            <div>
              <p className="font-semibold text-gray-600">No active subscription</p>
              <p className="text-sm text-gray-400">Choose a plan below to get started.</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Available Plans ───────────────────────────────── */}
      <h3 className="text-lg font-semibold text-gray-700 mb-4">Available Plans</h3>

      {loadingPlans ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse bg-white rounded-xl border-2 border-gray-200 p-6 space-y-4">
              <div className="h-5 bg-gray-200 rounded w-24" />
              <div className="h-8 bg-gray-200 rounded w-32" />
              <div className="space-y-2">
                {[1, 2, 3].map((j) => <div key={j} className="h-3 bg-gray-200 rounded" />)}
              </div>
              <div className="h-10 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      ) : sortedPlans.length === 0 ? (
        <div className="text-center py-12 text-gray-400 mb-8">
          <i className="fas fa-box-open text-3xl mb-2" />
          <p>No plans available at the moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
          {sortedPlans.map((plan) => {
            const isCurrent = currentSub?.planId === plan.id && currentSub.status === 'ACTIVE';
            const currentPrice = currentSub?.planPrice ?? -1;
            return (
              <PlanCard
                key={plan.id}
                plan={plan}
                isCurrent={isCurrent}
                isHigher={!isCurrent && currentPrice >= 0 && plan.price > currentPrice}
                isLower={!isCurrent && currentPrice >= 0 && plan.price < currentPrice}
                loading={checkingOutPlanId === plan.id}
                onSelect={handleSubscribe}
              />
            );
          })}
        </div>
      )}

      {/* ── Payment History ───────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-700">Payment History</h3>
        </div>

        {loadingPayments ? (
          <div className="p-6 animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-gray-100 rounded" />
            ))}
          </div>
        ) : !paymentData?.items.length ? (
          <div className="p-10 text-center text-gray-400">
            <i className="fas fa-receipt text-3xl mb-2" />
            <p>No payment records yet.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3 text-left">Date</th>
                    <th className="px-6 py-3 text-left">Description</th>
                    <th className="px-6 py-3 text-right">Amount</th>
                    <th className="px-6 py-3 text-left">Gateway</th>
                    <th className="px-6 py-3 text-left">Transaction ID</th>
                    <th className="px-6 py-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paymentData.items.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                        {formatDate(p.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-gray-800">{p.description}</td>
                      <td className="px-6 py-4 text-right font-semibold text-gray-800">
                        {formatCurrency(p.amount, p.currency)}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 text-gray-600">
                          <GatewayIcon gateway={p.gateway} />
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <code className="text-xs font-mono text-gray-500">
                          {p.transactionId ?? '—'}
                        </code>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={p.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {paymentData.meta && paymentData.meta.total > 10 && (
              <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
                <span>
                  Showing {paymentPage * 10 + 1}–
                  {Math.min((paymentPage + 1) * 10, paymentData.meta.total)} of{' '}
                  {paymentData.meta.total}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPaymentPage((p) => Math.max(0, p - 1))}
                    disabled={paymentPage === 0}
                    className="px-3 py-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                  >
                    <i className="fas fa-chevron-left text-xs" />
                  </button>
                  <button
                    onClick={() => setPaymentPage((p) => p + 1)}
                    disabled={(paymentPage + 1) * 10 >= paymentData.meta.total}
                    className="px-3 py-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                  >
                    <i className="fas fa-chevron-right text-xs" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
