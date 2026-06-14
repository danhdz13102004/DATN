import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import Topbar from '../../components/layout/Topbar';
import StatusBadge from '../../components/ui/StatusBadge';
import { useAdminCompanyDetail, useBlockCompany, useVerifyCompany } from '../../hooks/useAdminCompanies';
import { useToast } from '../../contexts/ToastContext';
import { ROUTES } from '../../constants';
import type { AdminCompanyStaffItem, AdminCompanyJobItem } from '../../types/admin';

interface OutletCtx { onMenuToggle: () => void; }

const ROLE_BADGE: Record<string, string> = {
  OWNER:     'bg-red-50 text-red-600 border-red-100',
  HR:        'bg-amber-50 text-amber-700 border-amber-100',
  RECRUITER: 'bg-blue-50 text-blue-700 border-blue-100',
};

const LEVEL_BADGE: Record<string, string> = {
  SENIOR:    'bg-indigo-50 text-indigo-700 border-indigo-100',
  MID_LEVEL: 'bg-blue-50 text-blue-700 border-blue-100',
  JUNIOR:    'bg-amber-50 text-amber-700 border-amber-100',
  ENTRY:     'bg-gray-50 text-gray-600 border-gray-200',
};

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start px-6 py-3 border-b border-gray-50 last:border-0">
      <dt className="w-36 shrink-0 text-xs font-medium text-gray-400 uppercase tracking-wide pt-0.5">{label}</dt>
      <dd className="text-sm text-gray-800">{value}</dd>
    </div>
  );
}

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { onMenuToggle } = useOutletContext<OutletCtx>();
  const navigate = useNavigate();
  const toast = useToast();

  const { data: company, isLoading } = useAdminCompanyDetail(id!);
  const { mutate: verifyCompany, isPending } = useVerifyCompany();
  const { mutate: blockCompany, isPending: isBlockPending } = useBlockCompany();

  const handleVerify = () => {
    if (!company) return;
    verifyCompany(company.id, {
      onSuccess: () => toast.success(`${company.name} has been verified`),
      onError: () => toast.error('Failed to verify company'),
    });
  };

  const handleUnverify = () => {
    // unverify is not yet an API action — placeholder
    void handleUnverify; // keep function for future use
    toast.error('Unverify is not supported yet');
  };

  const handleBlockToggle = () => {
    if (!company) return;
    const nextBlocked = !company.blocked;
    blockCompany(
      { id: company.id, blocked: nextBlocked },
      {
        onSuccess: () => toast.success(`${company.name} has been ${nextBlocked ? 'blocked' : 'unblocked'}`),
        onError: () => toast.error(`Failed to ${nextBlocked ? 'block' : 'unblock'} company`),
      },
    );
  };

  return (
    <div className="flex flex-col flex-1">
      <Topbar
        title="Company Detail"
        breadcrumbs={[
          { label: 'Dashboard', to: '/dashboard' },
          { label: 'Companies', to: ROUTES.COMPANIES },
          { label: company?.name ?? 'Detail' },
        ]}
        onMenuToggle={onMenuToggle}
      />

      <div className="p-6 space-y-5">
        {isLoading ? (
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 animate-pulse space-y-4">
            {[...Array(6)].map((_, i) => <div key={i} className="h-5 bg-gray-100 rounded w-3/4" />)}
          </div>
        ) : !company ? (
          <div className="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 text-center text-gray-400">
            <i className="fas fa-building text-4xl mb-3 block opacity-30" />
            <p>Company not found.</p>
            <button
              className="mt-4 text-sm text-primary hover:underline"
              onClick={() => navigate(ROUTES.COMPANIES)}
            >
              Back to companies
            </button>
          </div>
        ) : (
          <>
            {/* ── Company Header ── */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-start gap-4 flex-wrap">
                {company.logoUrl ? (
                  <img src={company.logoUrl} alt="" className="w-16 h-16 rounded-xl object-cover" />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-indigo-50 flex items-center justify-center text-2xl font-bold text-indigo-600">
                    {initials(company.name)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold text-gray-900">{company.name}</h2>
                  {company.description && (
                    <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{company.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <StatusBadge value={company.verified} />
                    {company.blocked && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-red-50 text-red-600 border-red-100">
                        Blocked
                      </span>
                    )}
                    {company.website && (
                      <a
                        href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
                      >
                        <i className="fas fa-globe" /> {company.website}
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {company.verified ? (
                    <></>
                    // <button
                    //   className="px-3 py-1.5 text-sm border border-red-200 text-red-600 rounded-xl hover:bg-red-50 transition-colors"
                    //   onClick={handleUnverify}
                    // >
                    //   <i className="fas fa-times-circle mr-1.5" />Unverify
                    // </button>
                  ) : (
                    <button
                      className="px-3 py-1.5 text-sm bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 disabled:opacity-60 transition-colors"
                      onClick={handleVerify}
                      disabled={isPending}
                    >
                      <i className="fas fa-check-circle mr-1.5" />Verify
                    </button>
                  )}
                  <button
                    className={`px-3 py-1.5 text-sm rounded-xl transition-colors disabled:opacity-60 ${
                      company.blocked
                        ? 'border border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                        : 'border border-red-200 text-red-600 hover:bg-red-50'
                    }`}
                    onClick={handleBlockToggle}
                    disabled={isBlockPending}
                  >
                    <i className={`fas ${company.blocked ? 'fa-unlock' : 'fa-ban'} mr-1.5`} />
                    {company.blocked ? 'Unblock' : 'Block'}
                  </button>
                  <button
                    className="px-3 py-1.5 text-sm border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                    onClick={() => navigate(ROUTES.COMPANIES)}
                  >
                    <i className="fas fa-arrow-left mr-1.5" />Back
                  </button>
                </div>
              </div>
            </div>

            {/* ── Company Information ── */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700">Company Information</h3>
              </div>
              <dl>
                <InfoRow label="Company ID" value={<span className="font-mono text-xs">{company.id}</span>} />
                <InfoRow label="Website" value={company.website
                  ? <a href={company.website.startsWith('http') ? company.website : `https://${company.website}`} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">{company.website}</a>
                  : '—'} />
                <InfoRow label="Verified" value={<StatusBadge value={company.verified} />} />
                <InfoRow
                  label="Access"
                  value={company.blocked ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-red-50 text-red-600 border-red-100">
                      Blocked
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-emerald-50 text-emerald-700 border-emerald-100">
                      Allowed
                    </span>
                  )}
                />
                <InfoRow label="Created At" value={new Date(company.createdAt).toLocaleDateString()} />
                {company.updatedAt && (
                  <InfoRow label="Updated At" value={new Date(company.updatedAt).toLocaleDateString()} />
                )}
              </dl>
              {company.description && (
                <div className="px-6 py-4 border-t border-gray-50">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Description</p>
                  <p className="text-sm text-gray-600 leading-relaxed">{company.description}</p>
                </div>
              )}
            </div>

            {/* ── Staff & Jobs row ── */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              {/* Staff Members */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-700">
                    Staff Members <span className="text-gray-400 font-normal">({company.totalStaff})</span>
                  </h3>
                </div>
                {company.staff.length === 0 ? (
                  <p className="px-6 py-8 text-sm text-gray-400 text-center">No staff members found.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">User</th>
                          <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Role</th>
                          <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Joined</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {company.staff.map((s: AdminCompanyStaffItem) => (
                          <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold shrink-0">
                                  {initials(s.fullName || s.email)}
                                </div>
                                <span className="text-gray-700 truncate max-w-[160px]" title={s.email}>{s.email}</span>
                              </div>
                            </td>
                            <td className="px-5 py-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${ROLE_BADGE[s.role] ?? 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                                {s.role}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-gray-500 whitespace-nowrap">
                              {new Date(s.joinedAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Active Jobs */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-700">
                    Active Jobs <span className="text-gray-400 font-normal">({company.totalActiveJobs})</span>
                  </h3>
                  <a
                    href={`${ROUTES.JOBS}?companyId=${company.id}`}
                    className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
                  >
                    View All <i className="fas fa-arrow-right" />
                  </a>
                </div>
                {company.activeJobs.length === 0 ? (
                  <p className="px-6 py-8 text-sm text-gray-400 text-center">No active jobs found.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Title</th>
                          <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Type</th>
                          <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Level</th>
                          <th className="px-5 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wide">Apps</th>
                          <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Posted</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {company.activeJobs.map((j: AdminCompanyJobItem) => (
                          <tr key={j.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-5 py-3 font-medium text-gray-800 max-w-[150px] truncate" title={j.title}>
                              {j.title}
                            </td>
                            <td className="px-5 py-3 text-gray-500 whitespace-nowrap">
                              {j.jobType?.replace('_', ' ') ?? '—'}
                            </td>
                            <td className="px-5 py-3">
                              {j.experienceLevels.length > 0 ? (
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${LEVEL_BADGE[j.experienceLevels[0]] ?? 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                                  {j.experienceLevels[0].replace('_', ' ')}
                                </span>
                              ) : '—'}
                            </td>
                            <td className="px-5 py-3 text-right text-gray-700 font-medium">{j.applicationCount}</td>
                            <td className="px-5 py-3 text-gray-500 whitespace-nowrap">
                              {new Date(j.createdAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

