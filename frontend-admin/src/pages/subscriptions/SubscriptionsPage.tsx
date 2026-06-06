import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useOutletContext } from 'react-router-dom';
import Topbar from '../../components/layout/Topbar';
import Pagination from '../../components/ui/Pagination';
import {
  useAdminPlans,
  useAdminSubscriptions,
  useCreatePlan,
  useUpdatePlan,
  useDeletePlan,
} from '../../hooks/useAdminSubscriptions';
import { useToast } from '../../contexts/ToastContext';
import type { AdminPlan, CreatePlanRequest, SubscriptionStatus } from '../../types/admin';

interface OutletCtx {
  onMenuToggle: () => void;
}

const STATUS_OPTIONS: { value: SubscriptionStatus | ''; label: string }[] = [
  { value: '', label: 'All Status' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const EMPTY_FORM: CreatePlanRequest = {
  name: '',
  price: 0,
  durationDays: 30,
  jobPostLimit: 0,
  allowUseAiMatching: false,
  autoFillLimit: 0,
};

function isExpiringSoon(endDate: string): boolean {
  const diff = new Date(endDate).getTime() - Date.now();
  return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000;
}

function SubscriptionStatusBadge({ status, endDate }: { status: SubscriptionStatus; endDate: string }) {
  if (status === 'ACTIVE' && isExpiringSoon(endDate)) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-amber-50 text-amber-700 border-amber-100">
        Expiring Soon
      </span>
    );
  }
  const cfg: Record<SubscriptionStatus, { label: string; className: string }> = {
    ACTIVE: { label: 'Active', className: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
    EXPIRED: { label: 'Expired', className: 'bg-red-50 text-red-600 border-red-100' },
    CANCELLED: { label: 'Cancelled', className: 'bg-gray-50 text-gray-500 border-gray-200' },
  };
  const c = cfg[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${c.className}`}>
      {c.label}
    </span>
  );
}

interface PlanFormModalProps {
  plan?: AdminPlan | null;
  onClose: () => void;
}

function PlanFormModal({ plan, onClose }: PlanFormModalProps) {
  const toast = useToast();
  const { mutate: createPlan, isPending: creating } = useCreatePlan();
  const { mutate: updatePlan, isPending: updating } = useUpdatePlan();
  const isPending = creating || updating;

  const [form, setForm] = useState<CreatePlanRequest>(
    plan
      ? {
          name: plan.name,
          price: plan.price,
          durationDays: plan.durationDays,
          jobPostLimit: plan.jobPostLimit,
          allowUseAiMatching: plan.allowUseAiMatching,
          autoFillLimit: plan.autoFillLimit,
        }
      : { ...EMPTY_FORM }
  );

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const set = (key: keyof CreatePlanRequest, value: string | number | boolean) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = () => {
    if (!form.name.trim()) { toast.error('Plan name is required'); return; }
    if (plan) {
      updatePlan(
        { id: plan.id, req: form },
        {
          onSuccess: () => { toast.success('Plan updated'); onClose(); },
          onError: (e: unknown) => {
            const msg = (e as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
            toast.error(msg ?? 'Failed to update plan');
          },
        }
      );
    } else {
      createPlan(form, {
        onSuccess: () => { toast.success('Plan created'); onClose(); },
        onError: (e: unknown) => {
          const msg = (e as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
          toast.error(msg ?? 'Failed to create plan');
        },
      });
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 animate-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-modal">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">{plan ? 'Edit Plan' : 'Add New Plan'}</h3>
          <button className="text-gray-400 hover:text-gray-600 transition-colors" onClick={onClose}>
            <i className="fas fa-times" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Plan Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary"
              placeholder="e.g. Enterprise"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price (USD) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary"
                placeholder="0.00"
                value={form.price}
                onChange={(e) => set('price', parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duration (Days) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min={1}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary"
                placeholder="30"
                value={form.durationDays}
                onChange={(e) => set('durationDays', parseInt(e.target.value) || 30)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Job Post Limit <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min={0}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary"
              placeholder="e.g. 50"
              value={form.jobPostLimit}
              onChange={(e) => set('jobPostLimit', parseInt(e.target.value) || 0)}
            />
            <p className="text-xs text-gray-400 mt-1">Set to 0 for unlimited job posts</p>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
            <div>
              <div className="text-sm font-medium text-gray-700">AI Matching</div>
              <div className="text-xs text-gray-400 mt-0.5">Allow companies to use AI-powered job matching</div>
            </div>
            <button
              type="button"
              onClick={() => set('allowUseAiMatching', !form.allowUseAiMatching)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                form.allowUseAiMatching ? 'bg-primary' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  form.allowUseAiMatching ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              AI Auto-fill Limit <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min={0}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary"
              placeholder="e.g. 5"
              value={form.autoFillLimit}
              onChange={(e) => set('autoFillLimit', parseInt(e.target.value) || 0)}
            />
            <p className="text-xs text-gray-400 mt-1">Set to 0 for unlimited auto-fill uses. Only applies if AI Matching is enabled.</p>
          </div>
        </div>

        <div className="flex gap-3 p-5 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button
            className="flex-1 px-4 py-2 border border-gray-200 text-sm rounded-xl font-medium hover:bg-gray-100 transition-colors"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="flex-1 px-4 py-2 bg-primary text-white text-sm rounded-xl font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors"
            onClick={handleSubmit}
            disabled={isPending}
          >
            {isPending ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving…
              </span>
            ) : plan ? 'Save Changes' : 'Create Plan'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function PlanCard({ plan, onEdit }: { plan: AdminPlan; onEdit: (p: AdminPlan) => void }) {
  const toast = useToast();
  const { mutate: deletePlan, isPending } = useDeletePlan();

  const handleDelete = () => {
    if (!confirm(`Delete plan "${plan.name}"? This cannot be undone.`)) return;
    deletePlan(plan.id, {
      onSuccess: () => toast.success('Plan deleted'),
      onError: (e: unknown) => {
        const msg = (e as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
        toast.error(msg ?? 'Failed to delete plan');
      },
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col gap-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-base font-bold text-gray-900">{plan.name}</div>
          <div className="text-2xl font-bold text-primary mt-1">
            ${plan.price.toLocaleString()}
            <span className="text-sm font-normal text-gray-400">/mo</span>
          </div>
        </div>
        <span className="text-xs text-gray-400 bg-gray-50 border border-gray-100 rounded-lg px-2 py-1">
          {plan.activeSubscriptions} active
        </span>
      </div>

      <ul className="space-y-1.5 text-sm text-gray-600">
        <li className="flex items-center gap-2">
          <i className="fas fa-check text-emerald-500 text-xs w-3" />
          {plan.jobPostLimit === 0 ? 'Unlimited job posts' : `${plan.jobPostLimit} job posts`}
        </li>
        <li className="flex items-center gap-2">
          <i className="fas fa-check text-emerald-500 text-xs w-3" />
          {plan.durationDays} days duration
        </li>
        <li className="flex items-center gap-2">
          {plan.allowUseAiMatching ? (
            <i className="fas fa-check text-emerald-500 text-xs w-3" />
          ) : (
            <i className="fas fa-times text-gray-300 text-xs w-3" />
          )}
          <span className={plan.allowUseAiMatching ? '' : 'text-gray-400'}>AI matching</span>
          {plan.allowUseAiMatching && (
            <span className="ml-auto text-xs text-primary bg-primary/10 rounded-full px-2 py-0.5 font-medium">
              Enabled
            </span>
          )}
        </li>
        <li className="flex items-center gap-2">
          {plan.autoFillLimit > 0 ? (
            <i className="fas fa-check text-emerald-500 text-xs w-3" />
          ) : (
            <i className="fas fa-times text-gray-300 text-xs w-3" />
          )}
          <span className={plan.autoFillLimit > 0 ? '' : 'text-gray-400'}>
            {plan.autoFillLimit === 0 ? 'Auto-fill (unlimited)' : `Auto-fill (${plan.autoFillLimit} uses)`}
          </span>
        </li>
      </ul>

      <div className="flex items-center gap-2 pt-2 border-t border-gray-50">
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors font-medium text-gray-700"
          onClick={() => onEdit(plan)}
        >
          <i className="fas fa-edit text-xs" /> Edit
        </button>
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-red-100 rounded-lg hover:bg-red-50 transition-colors font-medium text-red-500 disabled:opacity-50"
          onClick={handleDelete}
          disabled={isPending}
        >
          <i className="fas fa-trash text-xs" /> Delete
        </button>
      </div>
    </div>
  );
}

export default function SubscriptionsPage() {
  const { onMenuToggle } = useOutletContext<OutletCtx>();

  // Plans state
  const { data: plans, isLoading: plansLoading } = useAdminPlans();
  const [showAddPlan, setShowAddPlan] = useState(false);
  const [editingPlan, setEditingPlan] = useState<AdminPlan | null>(null);

  // Subscriptions filter state
  const [page, setPage] = useState(1);
  const [filterPlanId, setFilterPlanId] = useState('');
  const [filterStatus, setFilterStatus] = useState<SubscriptionStatus | ''>('');

  const { data: subscriptions, isLoading: subsLoading } = useAdminSubscriptions({
    page,
    size: 20,
    planId: filterPlanId || undefined,
    status: filterStatus || undefined,
  });

  const totalPages = subscriptions ? Math.ceil(subscriptions.meta.total / subscriptions.meta.pageSize) : 1;

  return (
    <div className="flex flex-col flex-1">
      <Topbar
        title="Subscriptions"
        breadcrumbs={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Subscriptions' }]}
        onMenuToggle={onMenuToggle}
      />

      <div className="p-6 space-y-6">
        {/* Plans header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Subscription Plans</h2>
            <p className="text-sm text-gray-400 mt-0.5">Manage available plans for companies</p>
          </div>
          <button
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm rounded-xl font-medium hover:bg-primary/90 transition-colors"
            onClick={() => setShowAddPlan(true)}
          >
            <i className="fas fa-plus" /> Add Plan
          </button>
        </div>

        {/* Plans grid */}
        {plansLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 h-48 animate-pulse">
                <div className="h-4 bg-gray-100 rounded w-1/2 mb-3" />
                <div className="h-8 bg-gray-100 rounded w-3/4 mb-4" />
                <div className="space-y-2">
                  <div className="h-3 bg-gray-100 rounded" />
                  <div className="h-3 bg-gray-100 rounded w-4/5" />
                </div>
              </div>
            ))}
          </div>
        ) : plans?.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 text-center">
            <i className="fas fa-crown text-4xl text-gray-200 mb-3 block" />
            <p className="text-gray-400 text-sm">No plans yet. Create your first plan.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans?.map((plan) => (
              <PlanCard key={plan.id} plan={plan} onEdit={setEditingPlan} />
            ))}
          </div>
        )}

        {/* Subscriptions table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-base font-bold text-gray-900">Active Subscriptions</h3>
            <div className="flex items-center gap-2">
              <select
                className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-primary bg-white"
                value={filterPlanId}
                onChange={(e) => { setFilterPlanId(e.target.value); setPage(1); }}
              >
                <option value="">All Plans</option>
                {plans?.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <select
                className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-primary bg-white"
                value={filterStatus}
                onChange={(e) => { setFilterStatus(e.target.value as SubscriptionStatus | ''); setPage(1); }}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              <span className="text-sm text-gray-400 ml-2">
                {subscriptions ? `${subscriptions.meta.total.toLocaleString()} total` : ''}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-6 py-3 font-semibold">Company</th>
                  <th className="text-left px-6 py-3 font-semibold">Plan</th>
                  <th className="text-left px-6 py-3 font-semibold">Start Date</th>
                  <th className="text-left px-6 py-3 font-semibold">End Date</th>
                  <th className="text-left px-6 py-3 font-semibold">Jobs Posted</th>
                  <th className="text-left px-6 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {subsLoading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i}>
                      {[...Array(6)].map((_, j) => (
                        <td key={j} className="px-6 py-4">
                          <div className="h-4 bg-gray-100 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : subscriptions?.data.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                      <i className="fas fa-crown text-3xl mb-3 block opacity-30" />
                      No subscriptions found
                    </td>
                  </tr>
                ) : (
                  subscriptions?.data.map((sub) => (
                    <tr key={sub.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                            {sub.companyName.slice(0, 2).toUpperCase()}
                          </div>
                          {sub.companyName}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-primary/10 text-primary border-primary/20">
                          {sub.planName}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {new Date(sub.startDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {new Date(sub.endDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-gray-500">{sub.jobsPostedCount}</td>
                      <td className="px-6 py-4">
                        <SubscriptionStatusBadge status={sub.status} endDate={sub.endDate} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      </div>

      {/* Modals */}
      {showAddPlan && <PlanFormModal onClose={() => setShowAddPlan(false)} />}
      {editingPlan && <PlanFormModal plan={editingPlan} onClose={() => setEditingPlan(null)} />}
    </div>
  );
}
