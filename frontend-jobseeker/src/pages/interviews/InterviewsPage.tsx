import { useEffect, useState } from 'react';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import FilterToolbar from '../../components/common/FilterToolbar';
import DataTable from '../../components/common/DataTable';
import EmptyState from '../../components/common/EmptyState';
import CompanyAvatar from '../../components/common/CompanyAvatar';
import StatusBadge from '../../components/common/StatusBadge';
import { interviewService } from '../../services/interviewService';
import type { InterviewListItem, InterviewStats } from '../../types/interview';

const TABLE_COLUMNS = [
  { key: 'job', label: 'Job Position', className: 'min-w-[180px]' },
  { key: 'company', label: 'Company', className: 'min-w-[160px]' },
  { key: 'datetime', label: 'Date & Time', className: 'min-w-[160px]' },
  { key: 'type', label: 'Type', className: 'min-w-[110px]' },
  { key: 'status', label: 'Status', className: 'min-w-[130px]' },
  { key: 'note', label: 'Note', className: 'min-w-[180px]' },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function isUpcoming(scheduledTime: string) {
  return new Date(scheduledTime).getTime() > Date.now();
}

export default function InterviewsPage() {
  const [interviews, setInterviews] = useState<InterviewListItem[]>([]);
  const [stats, setStats] = useState<InterviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      interviewService.listMyInterviews({
        status: statusFilter || undefined,
        meetingType: typeFilter || undefined,
      }),
      interviewService.getStats(),
    ])
      .then(([res, s]) => {
        setInterviews(res.data ?? []);
        setStats(s);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [statusFilter, typeFilter]);

  const activeFilters = [statusFilter, typeFilter].filter(Boolean).length;

  const handleClearFilters = () => {
    setStatusFilter('');
    setTypeFilter('');
  };

  const upcoming = interviews.filter((i) => isUpcoming(i.scheduledTime) && i.status !== 'CANCELLED');
  const hasUpcoming = upcoming.length > 0;

  const emptyStateNode = (
    <EmptyState
      icon="fa-calendar-check"
      title={activeFilters > 0 ? 'No matching interviews' : 'No interviews scheduled'}
      description={
        activeFilters > 0
          ? 'Try adjusting your filters to find more interviews.'
          : 'When companies invite you for interviews, they will appear here.'
      }
      secondaryAction={activeFilters > 0 ? { label: 'Clear Filters', onClick: handleClearFilters } : undefined}
    />
  );

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <PageHeader
        title="Interviews"
        subtitle="Manage your interview schedule and preparation."
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Upcoming"
          value={stats?.upcoming ?? 0}
          icon="fa-clock"
          color="blue"
          helperText="Scheduled interviews ahead"
        />
        <StatCard
          label="Completed"
          value={stats?.completed ?? 0}
          icon="fa-check-circle"
          color="green"
          helperText="Successfully completed"
        />
        <StatCard
          label="Cancelled"
          value={stats?.cancelled ?? 0}
          icon="fa-times-circle"
          color="red"
          helperText="Cancelled or rescheduled"
        />
      </div>

      {/* Filter Toolbar */}
      <FilterToolbar
        resultsSummary={
          !loading && interviews.length > 0
            ? `${interviews.length} interview${interviews.length !== 1 ? 's' : ''} found`
            : undefined
        }
        activeFilters={activeFilters}
      >
        {/* Status filter */}
        <div className="relative">
          <select
            className={`pl-3 pr-8 py-2.5 border rounded-xl text-sm font-medium transition-all appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 ${
              statusFilter ? 'bg-primary/5 border-primary/30 text-primary' : 'bg-gray-50/80 border-gray-100 text-gray-600 hover:border-gray-200'
            }`}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <i className="fas fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none" />
        </div>

        {/* Type filter */}
        <div className="relative">
          <select
            className={`pl-3 pr-8 py-2.5 border rounded-xl text-sm font-medium transition-all appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 ${
              typeFilter ? 'bg-primary/5 border-primary/30 text-primary' : 'bg-gray-50/80 border-gray-100 text-gray-600 hover:border-gray-200'
            }`}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">All Types</option>
            <option value="ONLINE">Online</option>
            <option value="OFFLINE">Offline</option>
          </select>
          <i className="fas fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none" />
        </div>

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

      {/* Upcoming interviews highlight */}
      {!loading && hasUpcoming && !statusFilter && !typeFilter && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
            <i className="fas fa-calendar-alt text-blue-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-blue-800">
              {upcoming.length} upcoming interview{upcoming.length !== 1 ? 's' : ''} this week
            </p>
            <p className="text-xs text-blue-600 mt-0.5">
              {upcoming[0]?.companyName} — {formatDate(upcoming[0]?.scheduledTime ?? '')} at {formatTime(upcoming[0]?.scheduledTime ?? '')}
            </p>
          </div>
          <div className="ml-auto">
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5 animate-pulse" />
              Upcoming
            </span>
          </div>
        </div>
      )}

      {/* Interviews Table */}
      <DataTable
        columns={TABLE_COLUMNS}
        isLoading={loading}
        isEmpty={interviews.length === 0}
        emptyState={emptyStateNode}
      >
        {interviews.map((iv) => {
          const upcomingIv = isUpcoming(iv.scheduledTime) && iv.status !== 'CANCELLED';
          const cancelled = iv.status === 'CANCELLED';

          return (
            <tr
              key={iv.id}
              className={`border-b border-gray-50 last:border-0 transition-colors duration-150 hover:bg-blue-50/30 ${
                upcomingIv ? 'bg-blue-50/10' : ''
              } ${cancelled ? 'opacity-60' : ''}`}
            >
              {/* Job Position */}
              <td className="px-5 py-4 align-middle">
                <div className="text-sm font-semibold text-gray-900 leading-tight">
                  {iv.jobTitle}
                </div>
              </td>

              {/* Company */}
              <td className="px-5 py-4 align-middle">
                <div className="flex items-center gap-3">
                  <CompanyAvatar initial={iv.companyInitial} size="md" variant="gradient" />
                  <span className="text-sm text-gray-600">{iv.companyName}</span>
                </div>
              </td>

              {/* Date & Time */}
              <td className="px-5 py-4 align-middle">
                <div className="text-sm font-medium text-gray-900">{formatDate(iv.scheduledTime)}</div>
                <div className="text-xs text-gray-400 mt-0.5">{formatTime(iv.scheduledTime)}</div>
              </td>

              {/* Type */}
              <td className="px-5 py-4 align-middle">
                <StatusBadge value={iv.meetingType} dot />
              </td>

              {/* Status */}
              <td className="px-5 py-4 align-middle">
                <StatusBadge value={iv.status} dot />
              </td>

              {/* Note */}
              <td className="px-5 py-4 align-middle">
                <span
                  className="text-sm text-gray-500 max-w-[200px] block truncate"
                  title={iv.note ?? undefined}
                >
                  {iv.note || '—'}
                </span>
              </td>
            </tr>
          );
        })}
      </DataTable>
    </div>
  );
}
