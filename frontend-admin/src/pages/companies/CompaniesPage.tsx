import { useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import Topbar from '../../components/layout/Topbar';
import StatusBadge from '../../components/ui/StatusBadge';
import Pagination from '../../components/ui/Pagination';
import { useAdminCompanies, useVerifyCompany } from '../../hooks/useAdminCompanies';
import { useToast } from '../../contexts/ToastContext';
import { ROUTES } from '../../constants';

interface OutletCtx { onMenuToggle: () => void; }

const FILTERS = [
  { value: '', label: 'All Companies' },
  { value: 'true', label: 'Verified' },
  { value: 'false', label: 'Pending Verification' },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function CompaniesPage() {
  const { onMenuToggle } = useOutletContext<OutletCtx>();
  const toast = useToast();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [verified, setVerified] = useState('');

  const { data, isLoading } = useAdminCompanies({
    page,
    size: 20,
    verified: verified === '' ? undefined : verified === 'true',
  });

  const { mutate: verifyCompany, isPending } = useVerifyCompany();

  const totalPages = data ? Math.ceil(data.meta.total / data.meta.pageSize) : 1;

  const handleVerify = (id: string, name: string) => {
    verifyCompany(id, {
      onSuccess: () => toast.success(`${name} has been verified`),
      onError: () => toast.error('Failed to verify company'),
    });
  };

  return (
    <div className="flex flex-col flex-1">
      <Topbar
        title="Companies"
        breadcrumbs={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Companies' }]}
        onMenuToggle={onMenuToggle}
      />

      <div className="p-6 space-y-4">
        {/* Filter tabs */}
        <div className="bg-white rounded-2xl px-5 py-4 shadow-sm border border-gray-100 flex flex-wrap items-center gap-3">
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                className={`px-4 py-2 transition-colors ${verified === f.value ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                onClick={() => { setVerified(f.value); setPage(1); }}
              >
                {f.label}
              </button>
            ))}
          </div>
          <span className="ml-auto text-sm text-gray-400">
            {data ? `${data.meta.total.toLocaleString()} companies` : ''}
          </span>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-6 py-3 font-semibold">Company</th>
                  <th className="text-left px-6 py-3 font-semibold">Website</th>
                  <th className="text-left px-6 py-3 font-semibold">Verified</th>
                  <th className="text-left px-6 py-3 font-semibold">Staff</th>
                  <th className="text-left px-6 py-3 font-semibold">Active Jobs</th>
                  <th className="text-left px-6 py-3 font-semibold">Created</th>
                  <th className="text-right px-6 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i}>
                      {[...Array(7)].map((_, j) => (
                        <td key={j} className="px-6 py-4">
                          <div className="h-4 bg-gray-100 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : data?.data.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                      <i className="fas fa-building text-3xl mb-3 block opacity-30" />
                      No companies found
                    </td>
                  </tr>
                ) : (
                  data?.data.map((company) => (
                    <tr key={company.id} className="hover:bg-gray-50 transition-colors">
                      {/* Company */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {company.logoUrl ? (
                            <img src={company.logoUrl} alt="" className="w-8 h-8 rounded-lg object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-primary text-xs font-bold">
                              {company.name.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <span className="font-medium text-gray-900">{company.name}</span>
                        </div>
                      </td>
                      {/* Website */}
                      <td className="px-6 py-4 text-gray-500">
                        {company.website ? (
                          <a href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                            target="_blank" rel="noreferrer"
                            className="text-primary hover:underline">
                            {company.website.replace(/^https?:\/\//, '')}
                          </a>
                        ) : '—'}
                      </td>
                      {/* Status */}
                      <td className="px-6 py-4">
                        <StatusBadge value={company.verified} />
                      </td>
                      {/* Staff */}
                      <td className="px-6 py-4 text-gray-700">{company.staffCount}</td>
                      {/* Active Jobs */}
                      <td className="px-6 py-4 text-gray-700">{company.activeJobsCount}</td>
                      {/* Created */}
                      <td className="px-6 py-4 text-gray-400">{formatDate(company.createdAt)}</td>
                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!company.verified && (
                            <button
                              className="inline-flex items-center gap-1 text-sm text-white bg-emerald-500 hover:bg-emerald-600 px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50"
                              onClick={() => handleVerify(company.id, company.name)}
                              disabled={isPending}
                            >
                              <i className="fas fa-check text-xs" /> Verify
                            </button>
                          )}
                          <button
                            className="text-sm text-gray-400 hover:text-primary p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                            onClick={() => navigate(`${ROUTES.COMPANIES}/${company.id}`)}
                            title="View details"
                          >
                            <i className="fas fa-eye" />
                          </button>
                        </div>
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
    </div>
  );
}
