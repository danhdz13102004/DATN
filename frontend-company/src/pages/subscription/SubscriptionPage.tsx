import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  useCurrentSubscription,
  useCreateCheckoutSession,
  usePaymentHistory,
  usePlans,
} from '../../hooks/useSubscription';
import type { Plan } from '../../types/subscription';

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

interface AlertBannerProps {
  type: 'success' | 'cancel' | 'error';
  message: string;
  onClose: () => void;
}

function AlertBanner({ type, message, onClose }: AlertBannerProps) {
  const colors = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    cancel: 'bg-amber-50 border-amber-200 text-amber-700',
    error: 'bg-red-50 border-red-200 text-red-700',
  };
  const icons = {
    success: 'fas fa-check-circle text-emerald-500',
    cancel: 'fas fa-info-circle text-amber-500',
    error: 'fas fa-exclamation-triangle text-red-500',
  };

  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border ${colors[type]}`}>
      <i className={`${icons[type]} mt-0.5 flex-shrink-0`} />
      <p className="flex-1 text-sm font-medium leading-relaxed">{message}</p>
      <button onClick={onClose} className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity">
        <i className="fas fa-times text-xs" />
      </button>
    </div>
  );
}

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
    { label: jobLimitText(plan.jobPostLimit), icon: 'fa-briefcase' },
    { label: `${plan.durationDays} days duration`, icon: 'fa-calendar-alt' },
    {
      label: plan.allowUseAiMatching ? 'AI-powered matching' : 'Standard matching',
      icon: 'fa-robot',
    },
    {
      label: plan.autoFillLimit > 0
        ? `Auto-fill (${plan.autoFillLimit} uses)`
        : 'Auto-fill (not available)',
      icon: 'fa-wand-magic-sparkles',
    },
  ];

  return (
    <div
      className={`pricing-card relative flex flex-col rounded-2xl border-2 p-6 lg:p-8 transition-all duration-200 ${
        isCurrent
          ? 'pricing-card featured'
          : 'border-gray-100 bg-white hover:border-primary/20'
      }`}
    >
      {isCurrent && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white px-5 py-1 rounded-full text-xs font-bold uppercase tracking-wide shadow-sm">
          Current Plan
        </div>
      )}

      {/* Plan header */}
      <div className="mb-5">
        <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
        <div className="flex items-baseline gap-1 mt-1.5">
          <span className="text-4xl font-black text-gray-900 tracking-tight">
            {formatCurrency(plan.price)}
          </span>
          <span className="text-sm text-gray-400 font-medium">/ {plan.durationDays} days</span>
        </div>
      </div>

      {/* Features */}
      <ul className="flex-1 space-y-3 mb-6">
        {features.map((f) => (
          <li key={f.label} className="flex items-center gap-3 text-sm text-gray-600">
            <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
              <i className={`fas ${f.icon} text-[10px]`} />
            </div>
            {f.label}
          </li>
        ))}
      </ul>

      {/* CTA */}
      {isCurrent ? (
        <button
          disabled
          className="w-full py-3 rounded-xl border-2 border-primary/20 text-primary font-semibold text-sm cursor-not-allowed opacity-60"
        >
          Current Plan
        </button>
      ) : isHigher ? (
        <button
          onClick={() => onSelect(plan)}
          disabled={loading}
          className="w-full py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary-hover hover:-translate-y-px hover:shadow-md transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:hover:translate-y-0 shadow-sm"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <i className="fas fa-arrow-up text-xs" />
              Upgrade
            </>
          )}
        </button>
      ) : isLower ? (
        <button
          onClick={() => onSelect(plan)}
          disabled={loading}
          className="w-full py-3 rounded-xl bg-white border-2 border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-gray-300/30 border-t-gray-500 rounded-full animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <i className="fas fa-arrow-down text-xs" />
              Downgrade
            </>
          )}
        </button>
      ) : (
        <button
          onClick={() => onSelect(plan)}
          disabled={loading}
          className="w-full py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary-hover hover:-translate-y-px hover:shadow-md transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 shadow-sm"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <i className="fas fa-check text-xs" />
              Choose Plan
            </>
          )}
        </button>
      )}
    </div>
  );
}

function GatewayIcon({ gateway }: { gateway: string }) {
  switch (gateway) {
    case 'STRIPE': return <><i className="fab fa-stripe-s text-indigo-500 mr-1" /> Stripe</>;
    case 'VNPAY':  return <><i className="fas fa-credit-card text-blue-500 mr-1" /> VNPay</>;
    case 'MOMO':   return <><i className="fas fa-wallet text-pink-500 mr-1" /> MoMo</>;
    default:       return <>{gateway}</>;
  }
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    SUCCESS:   'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200',
    PENDING:  'bg-amber-50 text-amber-600 ring-1 ring-amber-200',
    FAILED:   'bg-red-50 text-red-500 ring-1 ring-red-200',
    ACTIVE:   'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200',
    EXPIRED:  'bg-gray-100 text-gray-500',
    CANCELLED:'bg-red-50 text-red-500 ring-1 ring-red-200',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${styles[status] ?? 'bg-gray-100 text-gray-500'}`}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

export default function SubscriptionPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [alert, setAlert] = useState<{ type: 'success' | 'cancel' | 'error'; message: string } | null>(null);
  const [checkingOutPlanId, setCheckingOutPlanId] = useState<string | null>(null);
  const [paymentPage, setPaymentPage] = useState(0);
  const alertShownRef = useRef(false);

  useEffect(() => {
    if (alertShownRef.current) return;
    const paymentStatus = searchParams.get('payment');
    if (paymentStatus === 'success') {
      setAlert({ type: 'success', message: 'Payment received! Your subscription will be activated shortly. This page refreshes automatically.' });
      alertShownRef.current = true;
      setSearchParams({}, { replace: true });
    } else if (paymentStatus === 'cancelled') {
      setAlert({ type: 'cancel', message: 'Payment was cancelled. No charges were made.' });
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
      window.location.href = data.data.sessionUrl;
    } catch {
      setAlert({ type: 'error', message: 'Failed to start checkout. Please try again.' });
      setCheckingOutPlanId(null);
    }
  };

  const usagePct = currentSub
    ? currentSub.jobPostLimit === 0 ? 0 : Math.min(100, Math.round((currentSub.jobsPostedCount / currentSub.jobPostLimit) * 100))
    : 0;

  const autoFillUsagePct = currentSub && currentSub.autoFillLimit > 0
    ? Math.min(100, Math.round((currentSub.autoFillUsageCount / currentSub.autoFillLimit) * 100))
    : 0;

  const sortedPlans = [...plans].sort((a, b) => a.price - b.price);

  return (
    <div className="p-6 lg:p-8 max-w-full mx-12 space-y-6">

      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Subscription &amp; Payments</h2>
        <p className="text-sm text-gray-500 mt-1">Manage your plan and view payment history.</p>
      </div>

      {/* Alert */}
      {alert && (
        <AlertBanner type={alert.type} message={alert.message} onClose={() => setAlert(null)} />
      )}

      {/* ── Current Plan ───────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
        {/* Top accent */}
        <div className="h-1 bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600" />

        <div className="p-6 lg:p-8">
          {loadingSub ? (
            <div className="animate-pulse space-y-3">
              <div className="h-3 bg-gray-200 rounded w-28" />
              <div className="h-8 bg-gray-200 rounded w-56" />
              <div className="h-3 bg-gray-100 rounded w-40" />
            </div>
          ) : currentSub ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Current Plan</p>
                  <h3 className="text-2xl font-bold text-gray-900">{currentSub.planName} Plan</h3>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <StatusBadge status={currentSub.status} />
                    <span className="text-gray-300">·</span>
                    <span className="text-sm text-gray-500">{formatDate(currentSub.startDate)} — {formatDate(currentSub.endDate)}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
                    {currentSub.jobPostLimit === 0 ? 'Unlimited posts' : 'Job Posts Used'}
                  </p>
                  {currentSub.jobPostLimit > 0 && (
                    <p className="text-3xl font-black text-primary tracking-tight">
                      {currentSub.jobsPostedCount}
                      <span className="text-base font-normal text-gray-400"> / {currentSub.jobPostLimit}</span>
                    </p>
                  )}
                </div>
              </div>
              {currentSub.jobPostLimit > 0 && (
                <div className="mt-5 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      usagePct >= 90 ? 'bg-red-500' : usagePct >= 70 ? 'bg-amber-500' : 'bg-primary'
                    }`}
                    style={{ width: `${usagePct}%` }}
                  />
                </div>
              )}

              {/* Auto-fill usage — shown only when plan includes auto-fill (autoFillLimit > 0) */}
              {currentSub.autoFillLimit > 0 && (
                <div className="mt-5">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <i className="fas fa-wand-magic-sparkles text-primary text-xs" />
                      <span className="text-xs font-semibold text-gray-600">AI Auto-fill</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      <span className="font-medium">
                        {currentSub.autoFillUsageCount} / {currentSub.autoFillLimit}
                      </span>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        autoFillUsagePct >= 90 ? 'bg-red-500' : autoFillUsagePct >= 70 ? 'bg-amber-500' : 'bg-primary'
                      }`}
                      style={{ width: `${autoFillUsagePct}%` }}
                    />
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                <i className="fas fa-crown text-xl text-gray-300" />
              </div>
              <div>
                <p className="font-semibold text-gray-600">No active subscription</p>
                <p className="text-sm text-gray-400">Choose a plan below to get started.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Available Plans ───────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-5">
          <div className="w-1.5 h-5 bg-primary rounded-full" />
          <h3 className="text-lg font-bold text-gray-900">Available Plans</h3>
        </div>

        {loadingPlans ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl border-2 border-gray-100 p-6 animate-pulse space-y-4">
                <div className="h-5 bg-gray-200 rounded w-24" />
                <div className="h-8 bg-gray-100 rounded w-32" />
                <div className="space-y-2">
                  <div className="h-3 bg-gray-100 rounded" />
                  <div className="h-3 bg-gray-100 rounded" />
                  <div className="h-3 bg-gray-100 rounded" />
                </div>
                <div className="h-10 bg-gray-100 rounded-xl" />
              </div>
            ))}
          </div>
        ) : sortedPlans.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-box-open text-2xl text-gray-300" />
            </div>
            <p className="text-sm text-gray-500">No plans available at the moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
      </div>

      {/* ── Payment History ────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-5 bg-primary rounded-full" />
            <h3 className="text-base font-bold text-gray-900">Payment History</h3>
          </div>
        </div>

        {loadingPayments ? (
          <div className="p-6 animate-pulse space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-10 bg-gray-100 rounded" />)}
          </div>
        ) : !paymentData?.items.length ? (
          <div className="py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-receipt text-2xl text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-500">No payment records yet.</p>
            <p className="text-xs text-gray-400 mt-1">Your payment history will appear here.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-50 bg-gray-50/50">
                    <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-6 py-3 whitespace-nowrap">Date</th>
                    <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-6 py-3 whitespace-nowrap">Description</th>
                    <th className="text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-6 py-3 whitespace-nowrap">Amount</th>
                    <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-6 py-3 whitespace-nowrap hidden sm:table-cell">Gateway</th>
                    <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-6 py-3 whitespace-nowrap hidden md:table-cell">Transaction ID</th>
                    <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-6 py-3 whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentData.items.map((p) => (
                    <tr key={p.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(p.createdAt)}</td>
                      <td className="px-6 py-4 text-sm text-gray-800 font-medium">{p.description}</td>
                      <td className="px-6 py-4 text-right font-bold text-gray-900 whitespace-nowrap">{formatCurrency(p.amount, p.currency)}</td>
                      <td className="px-6 py-4 hidden sm:table-cell">
                        <span className="inline-flex items-center gap-1.5 text-sm text-gray-600">
                          <GatewayIcon gateway={p.gateway} />
                        </span>
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        <code className="text-xs font-mono text-gray-400 bg-gray-50 px-2 py-0.5 rounded">{p.transactionId ?? '—'}</code>
                      </td>
                      <td className="px-6 py-4"><StatusBadge status={p.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {paymentData.meta && paymentData.meta.total > 10 && (
              <div className="px-6 py-3 border-t border-gray-50 flex items-center justify-between text-sm text-gray-500">
                <span>
                  Showing {paymentPage * 10 + 1}–{Math.min((paymentPage + 1) * 10, paymentData.meta.total)} of {paymentData.meta.total}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPaymentPage((p) => Math.max(0, p - 1))}
                    disabled={paymentPage === 0}
                    className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-40 transition-colors"
                  >
                    <i className="fas fa-chevron-left text-xs" />
                  </button>
                  <button
                    onClick={() => setPaymentPage((p) => p + 1)}
                    disabled={(paymentPage + 1) * 10 >= paymentData.meta.total}
                    className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-40 transition-colors"
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
