import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import FilterToolbar from '../../components/common/FilterToolbar';
import DataTable from '../../components/common/DataTable';
import EmptyState from '../../components/common/EmptyState';
import CompanyAvatar from '../../components/common/CompanyAvatar';
import StatusBadge from '../../components/common/StatusBadge';
import { applicationService } from '../../services/applicationService';
import type { ApplicationListItem, ApplicationStats } from '../../types/application';

function WithdrawButton({ applicationId }: { applicationId: string }) {
  const [hovered, setHovered] = useState(false);
  const [pending, setPending] = useState(false);

  const handleWithdraw = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to withdraw this application? This action cannot be undone.')) return;
    setPending(true);
    try {
      await applicationService.withdraw(applicationId);
      window.location.reload();
    } catch {
      setPending(false);
    }
  };

  return (
    <button
      onClick={handleWithdraw}
      disabled={pending}
      className="inline-flex items-center justify-center rounded-xl transition-all duration-150"
      style={{
        width: 36,
        height: 36,
        background: hovered ? '#FEF2F2' : '#F9FAFB',
        color: hovered ? '#EF4444' : '#D1D5DB',
        border: 'none',
        cursor: pending ? 'not-allowed' : 'pointer',
        fontSize: '0.8rem',
        opacity: pending ? 0.6 : 1,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title="Withdraw application"
    >
      <i className={`fas ${pending ? 'fa-spinner fa-spin' : 'fa-times'}`} />
    </button>
  );
}

function ApplicationProgressBar({ status }: { status: string }) {
  const steps = ['APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED'];
  if (status === 'REJECTED' || status === 'WITHDRAWN') return null;

  const currentIdx = steps.indexOf(status);
  const pct = currentIdx === -1 ? 10 : Math.round(((currentIdx + 1) / steps.length) * 100);

  const barColor =
    status === 'HIRED' ? 'bg-emerald-500' :
    status === 'OFFER' ? 'bg-amber-400' :
    status === 'INTERVIEW' ? 'bg-violet-400' :
    status === 'SCREENING' ? 'bg-blue-400' :
    'bg-slate-300';

  return (
    <div className="mt-1.5">
      <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

const TABLE_COLUMNS = [
  { key: 'job', label: 'Job Position', className: 'min-w-[200px]' },
  { key: 'company', label: 'Company', className: 'min-w-[160px]' },
  { key: 'status', label: 'Status', className: 'min-w-[130px]' },
  { key: 'applied', label: 'Applied', className: 'min-w-[120px]' },
  { key: 'actions', label: '', className: 'w-20 text-right' },
];

export default function ApplicationsPage() {
  const navigate = useNavigate();
  const [apps, setApps] = useState<ApplicationListItem[]>([]);
  const [stats, setStats] = useState<ApplicationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      applicationService.listMyApplications({ status: statusFilter || undefined, search: search || undefined }),
      applicationService.getStats(),
    ]).then(([res, s]) => {
      setApps(res.data ?? []);
      setStats(s);
    }).catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [statusFilter, search]);

  const handleSearch = () => setSearch(searchInput);
  const handleSearchKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') setSearch(searchInput);
  };

  const activeFilters = [statusFilter, search].filter(Boolean).length;

  const handleClearFilters = () => {
    setStatusFilter('');
    setSearch('');
    setSearchInput('');
  };

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const canWithdraw = (status: string) => !['WITHDRAWN', 'HIRED', 'REJECTED'].includes(status);

  const emptyStateNode = (
    <EmptyState
      icon="fa-file-alt"
      title={activeFilters > 0 ? 'No matching applications' : 'No applications yet'}
      description={
        activeFilters > 0
          ? 'Try adjusting your search or filter criteria to find more results.'
          : 'Start your job search journey by browsing available positions.'
      }
      action={activeFilters > 0 ? undefined : { label: 'Browse Jobs', onClick: () => navigate('/jobs') }}
      secondaryAction={activeFilters > 0 ? { label: 'Clear Filters', onClick: handleClearFilters } : undefined}
    />
  );

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <PageHeader
        title="My Applications"
        subtitle="Track your submitted jobs and application progress."
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Applied"
          value={stats?.totalApplied ?? 0}
          icon="fa-paper-plane"
          color="blue"
        />
        <StatCard
          label="In Screening"
          value={stats?.inScreening ?? 0}
          icon="fa-search"
          color="amber"
        />
        <StatCard
          label="Interview"
          value={stats?.inInterview ?? 0}
          icon="fa-calendar-check"
          color="purple"
        />
        <StatCard
          label="Offers"
          value={stats?.offers ?? 0}
          icon="fa-trophy"
          color="green"
          helperText=""
        />
      </div>

      {/* Filter Toolbar */}
      <FilterToolbar
        resultsSummary={!loading && apps.length > 0 ? `Showing ${apps.length} application${apps.length !== 1 ? 's' : ''}` : undefined}
        activeFilters={activeFilters}
      >
        {/* Search */}
        <div className="flex-1 min-w-[200px] relative">
          <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300 text-xs" />
          <input
            type="text"
            className="w-full pl-9 pr-10 py-2.5 bg-gray-50/80 border border-gray-100 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            placeholder="Search by job title..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleSearchKey}
          />
          {searchInput && (
            <button
              onClick={() => { setSearchInput(''); setSearch(''); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <i className="fas fa-times text-xs" />
            </button>
          )}
        </div>

        {/* Status filter */}
        <div className="relative">
          <select
            className={`pl-3 pr-8 py-2.5 border rounded-xl text-sm font-medium transition-all appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 ${
              statusFilter ? 'bg-primary/5 border-primary/30 text-primary' : 'bg-gray-50/80 border-gray-100 text-gray-600 hover:border-gray-200'
            }`}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="APPLIED">Applied</option>
            <option value="SCREENING">Screening</option>
            <option value="INTERVIEW">Interview</option>
            <option value="OFFER">Offer</option>
            <option value="HIRED">Hired</option>
            <option value="REJECTED">Rejected</option>
            <option value="WITHDRAWN">Withdrawn</option>
          </select>
          <i className="fas fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none" />
        </div>

        {/* Search button */}
        <button
          onClick={handleSearch}
          className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-hover transition-colors shadow-sm"
        >
          <i className="fas fa-search text-xs" />
        </button>

        {/* Clear */}
        {activeFilters > 0 && (
          <button
            onClick={handleClearFilters}
            className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold text-red-500 bg-red-50 rounded-xl hover:bg-red-100 transition-colors"
          >
            <i className="fas fa-times" />
            Clear ({activeFilters})
          </button>
        )}
      </FilterToolbar>

      {/* Applications Table */}
      <DataTable
        columns={TABLE_COLUMNS}
        isLoading={loading}
        isEmpty={apps.length === 0}
        emptyState={emptyStateNode}
      >
        {apps.map((app) => (
          <tr
            key={app.id}
            className="group border-b border-gray-50 last:border-0 transition-colors duration-150 hover:bg-blue-50/30 cursor-pointer"
            onClick={() => navigate(`/applications/${app.id}`)}
          >
            {/* Job Position */}
            <td className="px-5 py-4 align-middle">
              <div className="text-sm font-semibold text-gray-900 group-hover:text-primary transition-colors leading-tight">
                {app.jobTitle}
              </div>
            </td>

            {/* Company */}
            <td className="px-5 py-4 align-middle">
              <div className="flex items-center gap-3">
                <CompanyAvatar initial={app.companyInitial} size="md" variant="gradient" />
                <span className="text-sm text-gray-600">{app.companyName}</span>
              </div>
            </td>

            {/* Status */}
            <td className="px-5 py-4 align-middle">
              <StatusBadge value={app.status} dot />
              <ApplicationProgressBar status={app.status} />
            </td>

            {/* Applied */}
            <td className="px-5 py-4 align-middle">
              <span className="text-sm text-gray-500">{formatDate(app.appliedAt)}</span>
            </td>

            {/* Actions */}
            <td className="px-5 py-4 align-middle">
              <div className="flex items-center justify-end gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => { e.stopPropagation(); navigate(`/applications/${app.id}`); }}
                  className="inline-flex items-center justify-center rounded-xl transition-all duration-150"
                  style={{
                    width: 36,
                    height: 36,
                    background: '#F9FAFB',
                    color: '#2563EB',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.background = '#EFF6FF';
                    (e.currentTarget as HTMLElement).style.color = '#1D4ED8';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = '#F9FAFB';
                    (e.currentTarget as HTMLElement).style.color = '#2563EB';
                  }}
                  title="View details"
                >
                  <i className="fas fa-expand" />
                </button>
                {canWithdraw(app.status) && (
                  <WithdrawButton applicationId={app.id} />
                )}
              </div>
            </td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}
