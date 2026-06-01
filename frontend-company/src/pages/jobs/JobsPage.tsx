import { useState } from 'react';
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

type ViewMode = 'grid' | 'table';

export default function JobsPage() {
  const { onMenuToggle } = useOutletContext<{ onMenuToggle: () => void }>();
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const { data: jobs, isLoading } = useCompanyJobs(filters);
  const deleteJob = useDeleteJob();
  const changeStatus = useChangeJobStatus();

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

  const handleDelete = (jobId: string) => {
    if (confirm('Delete this job? This action cannot be undone.')) {
      deleteJob.mutate(jobId);
    }
  };

  const handleClose = (jobId: string) => {
    changeStatus.mutate({ id: jobId, status: 'CLOSED' });
  };

  const handlePublish = (jobId: string) => {
    changeStatus.mutate({ id: jobId, status: 'PUBLISHED' });
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
                <span className="font-semibold text-gray-600">{jobs?.length ?? 0}</span> job{jobs?.length !== 1 ? 's' : ''} found
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
          ) : !jobs?.length ? (
            <EmptyState
              icon="fa-briefcase"
              title="No jobs found"
              description={activeFilterCount > 0 ? 'Try adjusting your filters to see more results.' : 'Create your first job posting to get started.'}
              actionLabel={activeFilterCount > 0 ? 'Clear Filters' : 'Create New Job'}
              onAction={activeFilterCount > 0 ? handleClearFilters : undefined}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {jobs.map((job, idx) => (
                <div key={job.id} className="animate-fadeSlideUp" style={{ animationDelay: `${idx * 60}ms` }}>
                  <JobCard
                    job={job}
                    onView={(id) => window.location.href = `/jobs/${id}`}
                    onEdit={(id) => window.location.href = `/jobs/${id}/edit`}
                    onDelete={handleDelete}
                    onPublish={handlePublish}
                    onClose={handleClose}
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
            ) : !jobs?.length ? (
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
                    {jobs.map((job) => (
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
                          <StatusBadge status={job.status} size="sm" />
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
                            <Link
                              to={`/jobs/${job.id}/edit`}
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-all duration-150 hover:scale-105"
                              title="Edit"
                            >
                              <i className="fas fa-pen text-xs" />
                            </Link>
                            {job.status === 'PUBLISHED' && (
                              <button
                                onClick={() => handleClose(job.id)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg text-amber-400 hover:bg-amber-50 hover:text-amber-600 transition-all duration-150 hover:scale-105"
                                title="Close job"
                              >
                                <i className="fas fa-times-circle text-xs" />
                              </button>
                            )}
                            {job.status === 'DRAFT' && (
                              <button
                                onClick={() => handlePublish(job.id)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg text-emerald-400 hover:bg-emerald-50 hover:text-emerald-600 transition-all duration-150 hover:scale-105"
                                title="Publish job"
                              >
                                <i className="fas fa-rocket text-xs" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(job.id)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:bg-red-50 hover:text-red-500 transition-all duration-150 hover:scale-105"
                              title="Delete"
                            >
                              <i className="fas fa-trash text-xs" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
