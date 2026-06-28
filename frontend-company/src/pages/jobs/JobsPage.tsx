import { useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import Topbar from '../../components/layout/Topbar';
import { useCompanyJobs, useDeleteJob, useChangeJobStatus } from '../../hooks/useJobs';
import { ROUTES } from '../../constants';
import { formatRelativeDate } from '../../utils/date';
import StatusBadge from '../../components/common/StatusBadge';
import JobCard from '../../components/common/JobCard';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import LoadingSkeleton, { JobCardSkeleton } from '../../components/common/LoadingSkeleton';
import ConfirmActionModal from '../../components/common/ConfirmActionModal';

type ViewMode = 'grid' | 'table';
type ConfirmAction =
  | { type: 'close'; jobId: string; jobTitle?: string }
  | { type: 'delete'; jobId: string; jobTitle?: string };

const todayDateInputValue = () => {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
};

const getEffectiveStatus = (job: { status: string; closeDate?: string | null }) => {
  if (job.status === 'CLOSED') return 'CLOSED';
  return job.closeDate && job.closeDate < todayDateInputValue() ? 'CLOSED' : job.status;
};

const getDateTime = (value?: string | null) => {
  const timestamp = value ? new Date(value).getTime() : 0;
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

export default function JobsPage() {
  const { onMenuToggle } = useOutletContext<{ onMenuToggle: () => void }>();
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const { data: jobs, isLoading } = useCompanyJobs(filters);
  const deleteJob = useDeleteJob();
  const changeStatus = useChangeJobStatus();
  const sortedJobs = useMemo(
    () =>
      [...(jobs ?? [])].sort(
        (a, b) => getDateTime(b.createdAt) - getDateTime(a.createdAt)
      ),
    [jobs]
  );

  const handleSearch = () => {
    setFilters((prev) => ({ ...prev, search }));
  };

  const handleFilter = (key: string, val: string) => {
    setFilters((prev) => {
      const next = { ...prev };
      if (val) next[key] = val;
      else delete next[key];
      return next;
    });
  };

  const handleClearFilters = () => {
    setFilters({});
    setSearch('');
  };

  const activeFilterCount = Object.values(filters).filter(Boolean).length + (search ? 1 : 0);

  const requestDelete = (jobId: string) => {
    const jobTitle = sortedJobs.find((job) => job.id === jobId)?.title;
    setConfirmAction({ type: 'delete', jobId, jobTitle });
  };

  const requestClose = (jobId: string) => {
    const jobTitle = sortedJobs.find((job) => job.id === jobId)?.title;
    setConfirmAction({ type: 'close', jobId, jobTitle });
  };

  const handlePublish = (jobId: string) => {
    changeStatus.mutate({ id: jobId, status: 'PUBLISHED' });
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;

    try {
      setIsConfirming(true);
      if (confirmAction.type === 'delete') {
        await deleteJob.mutateAsync(confirmAction.jobId);
      } else {
        await changeStatus.mutateAsync({ id: confirmAction.jobId, status: 'CLOSED' });
      }
      setConfirmAction(null);
    } catch (err) {
      console.error('Job action failed:', err);
    } finally {
      setIsConfirming(false);
    }
  };

  const modalCopy = confirmAction?.type === 'delete'
    ? {
        title: 'Delete this job?',
        message: `Deleting${confirmAction.jobTitle ? ` "${confirmAction.jobTitle}"` : ' this job'} removes it from your company workspace. This is only allowed when the job has no applicants.`,
        confirmLabel: 'Delete Job',
        icon: 'fa-trash',
        tone: 'danger' as const,
      }
    : {
        title: 'Close this job?',
        message: `Closing${confirmAction?.jobTitle ? ` "${confirmAction.jobTitle}"` : ' this job'} will expire it immediately and job seekers will no longer be able to view or apply to it.`,
        confirmLabel: 'Close Job',
        icon: 'fa-circle-xmark',
        tone: 'warning' as const,
      };

  return (
    <>
      <Topbar title="Jobs" onMenuToggle={onMenuToggle} />
      <div className="p-6 lg:p-8 space-y-6 max-w-screen-full mx-8">

        {/* ── Page Header ─────────────────────────────────── */}
        <PageHeader
          title="Job Postings"
          description="Manage your company's job listings"
          action={
            <Link
              to={ROUTES.JOB_CREATE}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-hover hover:-translate-y-px hover:shadow-md transition-all duration-200 no-underline shadow-sm"
            >
              <i className="fas fa-plus text-xs" />
              Create New Job
            </Link>
          }
        />

        {/* ── Filters + View Toggle ────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-4">
          <div className="flex flex-wrap items-center gap-3">

            {/* Search */}
            <div className="flex-1 min-w-[200px] relative">
              <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
              <input
                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                placeholder="Search jobs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>

            {/* Status filter */}
            <select
              className={`px-3 py-2.5 border rounded-xl text-sm font-medium transition-all appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                filters.status ? 'bg-primary/5 border-primary/30 text-primary' : 'bg-gray-50 border-gray-100 text-gray-600 hover:border-gray-200'
              }`}
              onChange={(e) => handleFilter('status', e.target.value)}
              value={filters.status ?? ''}
            >
              <option value="">All Status</option>
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="CLOSED">Closed</option>
            </select>

            {/* Type filter */}
            <select
              className={`px-3 py-2.5 border rounded-xl text-sm font-medium transition-all appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                filters.type ? 'bg-primary/5 border-primary/30 text-primary' : 'bg-gray-50 border-gray-100 text-gray-600 hover:border-gray-200'
              }`}
              onChange={(e) => handleFilter('type', e.target.value)}
              value={filters.type ?? ''}
            >
              <option value="">All Types</option>
              <option value="FULLTIME">Full-time</option>
              <option value="PARTTIME">Part-time</option>
              <option value="REMOTE">Remote</option>
              <option value="HYBRID">Hybrid</option>
            </select>

            {/* Level filter */}
            <select
              className={`px-3 py-2.5 border rounded-xl text-sm font-medium transition-all appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                filters.level ? 'bg-primary/5 border-primary/30 text-primary' : 'bg-gray-50 border-gray-100 text-gray-600 hover:border-gray-200'
              }`}
              onChange={(e) => handleFilter('level', e.target.value)}
              value={filters.level ?? ''}
            >
              <option value="">All Levels</option>
              <option value="INTERN">Intern</option>
              <option value="FRESHER">Fresher</option>
              <option value="JUNIOR">Junior</option>
              <option value="MIDDLE">Middle</option>
              <option value="SENIOR">Senior</option>
              <option value="LEADER">Leader</option>
            </select>

            {/* View toggle */}
            <div className="tab-segmented shrink-0">
              <button
                className={viewMode === 'grid' ? 'active' : ''}
                onClick={() => setViewMode('grid')}
                title="Grid view"
              >
                <i className="fas fa-th-large" />
              </button>
              <button
                className={viewMode === 'table' ? 'active' : ''}
                onClick={() => setViewMode('table')}
                title="Table view"
              >
                <i className="fas fa-list" />
              </button>
            </div>
          </div>

          {/* Active filters summary + clear */}
          {activeFilterCount > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400">
                <span className="font-semibold text-gray-600">{sortedJobs.length}</span> job{sortedJobs.length !== 1 ? 's' : ''} found
                <span className="ml-1 text-primary">({activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active)</span>
              </p>
              <button
                onClick={handleClearFilters}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-500 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
              >
                <i className="fas fa-times" />
                Clear Filters
              </button>
            </div>
          )}
        </div>

        {/* ── Grid View ──────────────────────────────────── */}
        {viewMode === 'grid' && (
          isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="animate-fadeSlideUp" style={{ animationDelay: `${i * 80}ms` }}>
                  <JobCardSkeleton />
                </div>
              ))}
            </div>
          ) : !sortedJobs.length ? (
            <EmptyState
              icon="fa-briefcase"
              title="No jobs found"
              description={activeFilterCount > 0 ? 'Try adjusting your filters to see more results.' : 'Create your first job posting to get started.'}
              actionLabel={activeFilterCount > 0 ? 'Clear Filters' : 'Create New Job'}
              onAction={activeFilterCount > 0 ? handleClearFilters : undefined}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {sortedJobs.map((job, idx) => (
                <div key={job.id} className="h-full animate-fadeSlideUp" style={{ animationDelay: `${idx * 60}ms` }}>
                  <JobCard
                    job={{ ...job, status: getEffectiveStatus(job) as typeof job.status }}
                    onView={(id) => window.location.href = `/jobs/${id}`}
                    onEdit={(id) => window.location.href = `/jobs/${id}/edit`}
                    onDelete={requestDelete}
                    onPublish={handlePublish}
                    onClose={requestClose}
                  />
                </div>
              ))}
            </div>
          )
        )}

        {/* ── Table View ─────────────────────────────────── */}
        {viewMode === 'table' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {isLoading ? (
              <div className="p-6">
                <LoadingSkeleton variant="table-row" count={6} />
              </div>
            ) : !sortedJobs.length ? (
              <EmptyState
                icon="fa-briefcase"
                title="No jobs found"
                description={activeFilterCount > 0 ? 'Try adjusting your filters to see more results.' : 'Create your first job posting to get started.'}
                actionLabel={activeFilterCount > 0 ? 'Clear Filters' : 'Create New Job'}
                onAction={activeFilterCount > 0 ? handleClearFilters : undefined}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      {['Job Title', 'Type', 'Level', 'Location', 'Salary', 'Status', 'Apps', 'Created', ''].map((h) => (
                        <th
                          key={h}
                          className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-5 py-3 whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedJobs.map((job) => {
                      const effectiveStatus = getEffectiveStatus(job);
                      const hasApplicants = (job.applicationCount ?? 0) > 0;
                      return (
                        <tr
                          key={job.id}
                          className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors duration-150 group"
                        >
                          {/* Title */}
                          <td className="px-5 py-4">
                            <Link
                              to={`/jobs/${job.id}`}
                              className="text-sm font-bold text-gray-900 hover:text-primary transition-colors no-underline whitespace-nowrap"
                            >
                              {job.title}
                            </Link>
                          </td>

                        {/* Type */}
                        <td className="px-5 py-4">
                          <span className="text-sm text-gray-600 whitespace-nowrap">
                            {{ FULLTIME: 'Full-time', PARTTIME: 'Part-time', REMOTE: 'Remote', HYBRID: 'Hybrid' }[job.jobType] ?? job.jobType}
                          </span>
                        </td>

                        {/* Level */}
                        <td className="px-5 py-4">
                          <span className="text-sm text-gray-600 whitespace-nowrap">
                            {job.experienceLevels?.map((l: string) => l.charAt(0) + l.slice(1).toLowerCase()).join(', ') || '—'}
                          </span>
                        </td>

                        {/* Location */}
                        <td className="px-5 py-4 hidden sm:table-cell">
                          <span className="text-sm text-gray-500 whitespace-nowrap">{job.location}</span>
                        </td>

                        {/* Salary */}
                        <td className="px-5 py-4 hidden md:table-cell">
                          <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                            {job.salaryMin && job.salaryMax
                              ? `$${job.salaryMin.toLocaleString()} – $${job.salaryMax.toLocaleString()}`
                              : '—'}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4">
                          <StatusBadge status={effectiveStatus} size="sm" />
                        </td>

                        {/* Applications */}
                        <td className="px-5 py-4 hidden lg:table-cell">
                          <span className="text-sm font-semibold text-gray-700">
                            {job.applicationCount ?? 0}
                          </span>
                        </td>

                        {/* Created */}
                        <td className="px-5 py-4 hidden xl:table-cell">
                          <span className="text-sm text-gray-400 whitespace-nowrap">
                            {formatRelativeDate(job.createdAt)}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1.5 opacity-70 group-hover:opacity-100 transition-opacity">
                            <Link
                              to={`/jobs/${job.id}`}
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-all duration-150 hover:scale-105"
                              title="View"
                            >
                              <i className="fas fa-eye text-xs" />
                            </Link>
                            {effectiveStatus !== 'CLOSED' && !hasApplicants && (
                              <Link
                                to={`/jobs/${job.id}/edit`}
                                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-all duration-150 hover:scale-105"
                                title="Edit"
                              >
                                <i className="fas fa-pen text-xs" />
                              </Link>
                            )}
                            {effectiveStatus === 'PUBLISHED' && (
                              <button
                                onClick={() => requestClose(job.id)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg text-amber-400 hover:bg-amber-50 hover:text-amber-600 transition-all duration-150 hover:scale-105"
                                title="Close job"
                              >
                                <i className="fas fa-times-circle text-xs" />
                              </button>
                            )}
                            {effectiveStatus === 'DRAFT' && (
                              <button
                                onClick={() => handlePublish(job.id)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg text-emerald-400 hover:bg-emerald-50 hover:text-emerald-600 transition-all duration-150 hover:scale-105"
                                title="Publish job"
                              >
                                <i className="fas fa-rocket text-xs" />
                              </button>
                            )}
                            {!hasApplicants && (
                              <button
                                onClick={() => requestDelete(job.id)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:bg-red-50 hover:text-red-500 transition-all duration-150 hover:scale-105"
                                title="Delete"
                              >
                                <i className="fas fa-trash text-xs" />
                              </button>
                            )}
                          </div>
                        </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
      {confirmAction && (
        <ConfirmActionModal
          open
          title={modalCopy.title}
          message={modalCopy.message}
          confirmLabel={modalCopy.confirmLabel}
          icon={modalCopy.icon}
          tone={modalCopy.tone}
          isLoading={isConfirming}
          onClose={() => setConfirmAction(null)}
          onConfirm={handleConfirmAction}
        />
      )}
    </>
  );
}
