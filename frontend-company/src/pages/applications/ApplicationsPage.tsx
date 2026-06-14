import { useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import Topbar from '../../components/layout/Topbar';
import { useApplications } from '../../hooks/useApplications';
import { useJobSelectOptions } from '../../hooks/useJobs';
import { ROUTES, STATUS_LABELS } from '../../constants';
import StatCard from '../../components/common/StatCard';
import StatusBadge from '../../components/common/StatusBadge';
import CircularScore from '../../components/common/CircularScore';
import EmptyState from '../../components/common/EmptyState';
import PageHeader from '../../components/common/PageHeader';
import { ApplicationSkeleton } from '../../components/common/LoadingSkeleton';

function isRecent(isoDate: string) {
  const diff = Date.now() - new Date(isoDate).getTime();
  return diff < 3 * 24 * 60 * 60 * 1000;
}

const STATUS_BAR_COLOR: Record<string, { bar: string; width: string }> = {
  HIRED:      { bar: 'bg-emerald-500', width: 'w-full' },
  OFFER:      { bar: 'bg-amber-400', width: 'w-4/5' },
  INTERVIEW:  { bar: 'bg-violet-400', width: 'w-3/5' },
  SCREENING:  { bar: 'bg-blue-400', width: 'w-2/5' },
  REJECTED:   { bar: 'bg-red-400', width: 'w-full opacity-40' },
  APPLIED:    { bar: 'bg-slate-300', width: 'w-1/5' },
};
void STATUS_BAR_COLOR; // reserved for future use

export default function ApplicationsPage() {
  const { onMenuToggle } = useOutletContext<{ onMenuToggle: () => void }>();
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [searchInput, setSearchInput] = useState('');
  const { data: appsData, isLoading } = useApplications(filters);
  const { data: jobOptions } = useJobSelectOptions();

  const apps = appsData?.data || [];
  const stats = appsData?.stats;

  const handleFilter = (key: string, val: string) => {
    setFilters((prev) => {
      const next = { ...prev };
      if (val) next[key] = val;
      else delete next[key];
      return next;
    });
  };

  const handleSearch = () => handleFilter('search', searchInput);
  const handleClearFilters = () => { setFilters({}); setSearchInput(''); };

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <>
      <Topbar title="Applications" onMenuToggle={onMenuToggle} />
      <div className="p-6 lg:p-8 space-y-6 max-w-screen-full mx-8">

        {/* Page Header */}
        <PageHeader
          title="Applications"
          description="Review and manage all candidate applications"
        />

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="animate-fadeSlideUp delay-100">
            <StatCard
              label="Total Applications"
              value={stats?.total ?? 0}
              icon="fa-file-alt"
              iconBg="bg-blue-100"
              iconColor="text-blue-600"
              bgGradient="from-blue-50 to-indigo-50"
              borderColor="border-blue-100/60"
            />
          </div>
          <div className="animate-fadeSlideUp delay-200">
            <StatCard
              label="Under Screening"
              value={stats?.screening ?? 0}
              icon="fa-search"
              iconBg="bg-amber-100"
              iconColor="text-amber-600"
              bgGradient="from-amber-50 to-orange-50"
              borderColor="border-amber-100/60"
            />
          </div>
          <div className="animate-fadeSlideUp delay-300">
            <StatCard
              label="In Interview"
              value={stats?.interview ?? 0}
              icon="fa-comments"
              iconBg="bg-violet-100"
              iconColor="text-violet-600"
              bgGradient="from-violet-50 to-purple-50"
              borderColor="border-violet-100/60"
            />
          </div>
          <div className="animate-fadeSlideUp delay-400">
            <StatCard
              label="Successfully Hired"
              value={stats?.hired ?? 0}
              icon="fa-user-check"
              iconBg="bg-emerald-100"
              iconColor="text-emerald-600"
              bgGradient="from-emerald-50 to-green-50"
              borderColor="border-emerald-100/60"
            />
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-4 animate-fadeSlideUp delay-200">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="flex-1 min-w-[200px] relative">
              <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300 text-xs" />
              <input
                className="w-full pl-9 pr-10 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                placeholder="Search by name or email..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              {searchInput && (
                <button
                  onClick={() => { setSearchInput(''); handleFilter('search', ''); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <i className="fas fa-times text-xs" />
                </button>
              )}
            </div>

            {/* Status */}
            <select
              className={`px-3 py-2.5 border rounded-xl text-sm font-medium transition-all appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                filters.status ? 'bg-primary/5 border-primary/30 text-primary' : 'bg-gray-50 border-gray-100 text-gray-600 hover:border-gray-200'
              }`}
              value={filters.status ?? ''}
              onChange={(e) => handleFilter('status', e.target.value)}
            >
              <option value="">All Status</option>
              {['APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED'].map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>

            {/* Job */}
            <select
              className={`px-3 py-2.5 border rounded-xl text-sm font-medium transition-all appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                filters.jobId ? 'bg-primary/5 border-primary/30 text-primary' : 'bg-gray-50 border-gray-100 text-gray-600 hover:border-gray-200'
              }`}
              value={filters.jobId ?? ''}
              onChange={(e) => handleFilter('jobId', e.target.value)}
            >
              <option value="">All Jobs</option>
              {jobOptions?.map((j) => (
                <option key={j.id} value={j.id}>{j.title}</option>
              ))}
            </select>

            {/* Sort */}
            <select
              className={`px-3 py-2.5 border rounded-xl text-sm font-medium transition-all appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                filters.sort ? 'bg-primary/5 border-primary/30 text-primary' : 'bg-gray-50 border-gray-100 text-gray-600 hover:border-gray-200'
              }`}
              value={filters.sort ?? ''}
              onChange={(e) => handleFilter('sort', e.target.value)}
            >
              <option value="appliedAt,desc">Newest First</option>
              <option value="aiScore,desc">AI Score: High to Low</option>
              <option value="aiScore,asc">AI Score: Low to High</option>
              <option value="appliedAt,asc">Oldest First</option>
            </select>

            {/* Clear Filters */}
            {activeFilterCount > 0 && (
              <button
                onClick={handleClearFilters}
                className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold text-red-500 bg-red-50 rounded-xl hover:bg-red-100 transition-colors"
              >
                <i className="fas fa-times" />
                Clear ({activeFilterCount})
              </button>
            )}
          </div>

          {/* Results summary */}
          {!isLoading && apps.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
              <p className="text-xs text-gray-400">
                Showing <span className="font-semibold text-gray-600">{apps.length}</span> application{apps.length !== 1 ? 's' : ''}
              </p>
              {activeFilterCount > 0 && (
                <p className="text-xs text-primary font-medium">
                  <i className="fas fa-filter-alt mr-1" />
                  {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active
                </p>
              )}
            </div>
          )}
        </div>

        {/* Applications List */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-fadeSlideUp" style={{ animationDelay: `${i * 80}ms` }}>
                <ApplicationSkeleton />
              </div>
            ))}
          </div>
        ) : apps.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-card border border-gray-100">
            <EmptyState
              icon="fa-inbox"
              title="No applications found"
              description={activeFilterCount > 0
                ? 'Try adjusting your filters to see more results.'
                : 'When candidates apply for your jobs, they will appear here.'}
              actionLabel={activeFilterCount > 0 ? 'Clear All Filters' : undefined}
              onAction={activeFilterCount > 0 ? handleClearFilters : undefined}
            />
          </div>
        ) : (
          <div className="space-y-3">
            {apps.map((app, index) => {
              const recent = isRecent(app.appliedAt);

              return (
                <div
                  key={app.id}
                  className={`group relative bg-white rounded-2xl shadow-card border transition-all duration-200 hover:shadow-card-hover hover:-translate-y-px ${
                    recent ? 'ring-2 ring-primary/10 border-primary/20' : 'border-gray-100'
                  }`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* New indicator */}
                  {recent && (
                    <div className="absolute -top-px left-6 right-6 h-0.5 bg-gradient-to-r from-transparent via-primary/40 to-transparent rounded-full" />
                  )}

                  <div className="flex items-center gap-4 p-4">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 text-emerald-600 flex items-center justify-center text-sm font-bold shadow-sm border border-emerald-100">
                        {app.candidateName?.charAt(0)?.toUpperCase() ?? '?'}
                      </div>
                      {app.status === 'HIRED' && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center ring-2 ring-white">
                          <i className="fas fa-check text-white text-[8px]" />
                        </div>
                      )}
                    </div>

                    {/* Candidate Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-gray-900">{app.candidateName}</span>
                        {recent && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold text-primary bg-primary/10 rounded-md">NEW</span>
                        )}
                        {app.status === 'OFFER' && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold text-amber-600 bg-amber-50 rounded-md">
                            <i className="fas fa-star text-[8px] mr-0.5" />OFFER SENT
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">{app.candidateEmail}</div>
                    </div>

                    {/* Job */}
                    <div className="hidden sm:block min-w-0 px-3 border-l border-gray-100">
                      <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Position</div>
                      <div className="text-sm font-medium text-gray-700 truncate max-w-[180px]">{app.jobTitle}</div>
                    </div>

                    {/* AI Score */}
                    <div className="hidden md:flex items-center gap-3 px-3 border-l border-gray-100">
                      <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">AI Match</div>
                      {app.aiScore != null ? (
                        <CircularScore score={app.aiScore} />
                      ) : (
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gray-100">
                          <i className="fas fa-lock text-[10px] text-gray-400" />
                          <span className="text-xs text-gray-400 font-medium">Upgrade</span>
                        </div>
                      )}
                    </div>

                    {/* Status */}
                    <div className="hidden sm:block px-3 border-l border-gray-100">
                      <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Status</div>
                      <StatusBadge status={app.status} showRing />
                    </div>

                    {/* Date */}
                    <div className="hidden lg:block px-3 border-l border-gray-100">
                      <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Applied</div>
                      <div className="text-xs font-medium text-gray-500">
                        {new Date(app.appliedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 ml-auto">
                      <Link
                        to={`/applications/${app.id}`}
                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-all duration-150 shadow-sm hover:scale-105"
                        title="View Detail"
                      >
                        <i className="fas fa-expand text-sm" />
                      </Link>
                      <Link
                        to={`${ROUTES.INTERVIEW_SCHEDULE}?applicationId=${app.id}`}
                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 text-gray-400 hover:bg-emerald-50 hover:text-emerald-600 transition-all duration-150 shadow-sm hover:scale-105"
                        title="Schedule Interview"
                      >
                        <i className="fas fa-calendar-plus text-sm" />
                      </Link>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
