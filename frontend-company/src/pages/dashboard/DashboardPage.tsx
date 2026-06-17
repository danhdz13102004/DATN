import { Link } from 'react-router-dom';
import { useOutletContext } from 'react-router-dom';
import Topbar from '../../components/layout/Topbar';
import { useDashboardStats, useRecentApplications } from '../../hooks/useDashboard';
import { ROUTES } from '../../constants';
import StatusBadge from '../../components/common/StatusBadge';
import MatchScoreBadge from '../../components/common/MatchScoreBadge';
import EmptyState from '../../components/common/EmptyState';
import { StatCardSkeleton, TableSkeleton } from '../../components/common/LoadingSkeleton';

function getInitials(name?: string, email?: string) {
  const displayName = name || email || '?';
  return displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || '?';
}

function formatAppliedDate(value?: string) {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function DashboardPage() {
  const { onMenuToggle } = useOutletContext<{ onMenuToggle: () => void }>();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: recentApps, isLoading: appsLoading } = useRecentApplications();

  const statCards = [
    {
      title: 'Total Jobs',
      value: stats?.totalJobs ?? '—',
      change: stats?.jobsTrend ? `${stats.jobsTrend}% this month` : '',
      icon: 'fa-briefcase',
      bgGradient: 'from-emerald-50 to-teal-50',
      borderColor: 'border-emerald-100/50',
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      isUp: true,
    },
    {
      title: 'Active Applications',
      value: stats?.activeApplications ?? '—',
      change: stats?.applicationsTrend ? `${stats.applicationsTrend}% this week` : '',
      icon: 'fa-file-alt',
      bgGradient: 'from-blue-50 to-indigo-50',
      borderColor: 'border-blue-100/50',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      isUp: true,
    },
    {
      title: 'Interviews This Week',
      value: stats?.interviewsThisWeek ?? '—',
      change: stats?.interviewsPending ? `${stats.interviewsPending} pending` : '',
      icon: 'fa-calendar-check',
      bgGradient: 'from-amber-50 to-orange-50',
      borderColor: 'border-amber-100/50',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      isUp: false,
    },
    {
      title: 'New Messages',
      value: stats?.newMessagesUnread ?? '—',
      change: stats?.newMessagesUnread ? `${stats.newMessagesUnread} unread` : '',
      icon: 'fa-comment-dots',
      bgGradient: 'from-violet-50 to-purple-50',
      borderColor: 'border-violet-100/50',
      iconBg: 'bg-violet-100',
      iconColor: 'text-violet-600',
      isUp: true,
    },
  ];

  return (
    <>
      <Topbar title="Dashboard" onMenuToggle={onMenuToggle} />
      <div className="p-6 lg:p-6 space-y-8 max-w-full mx-8">

        {/* ── Page Header ─────────────────────────────────── */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
              <span className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">
                Welcome back
              </span>
            </h1>
            <p className="text-sm text-gray-500 mt-1.5">
              Here's what's happening with your recruitment today.
            </p>
          </div>
          {/* Subtle decorative element */}
          <div className="hidden xl:flex items-center gap-3 py-2 px-4 bg-primary/5 rounded-2xl border border-primary/10">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <i className="fas fa-bolt text-primary text-xs" />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Today</p>
              <p className="text-xs font-bold text-gray-700">{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
            </div>
          </div>
        </div>

        {/* ── Stats Grid ───────────────────────────────────── */}
        {statsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-fadeSlideUp" style={{ animationDelay: `${i * 100}ms` }}>
                <StatCardSkeleton />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            {statCards.map((card, idx) => (
              <div
                key={card.title}
                className="group relative overflow-hidden bg-gradient-to-br border rounded-2xl p-5 hover:-translate-y-0.5 transition-all duration-200 cursor-default animate-fadeSlideUp"
                style={{ animationDelay: `${idx * 100}ms` }}
                data-stat-card
              >
                {/* Decorative background blob */}
                <div
                  className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full blur-2xl opacity-30"
                  style={{
                    background: idx === 0 ? '#10b981' : idx === 1 ? '#3b82f6' : idx === 2 ? '#f59e0b' : '#8b5cf6',
                  }}
                />

                {/* Icon */}
                <div
                  className={`w-11 h-11 rounded-xl ${card.iconBg} ${card.iconColor} flex items-center justify-center mb-4 shadow-sm transition-transform duration-200 group-hover:scale-110`}
                >
                  <i className={`fas ${card.icon} text-base`} />
                </div>

                {/* Content */}
                <div>
                  <div
                    className="text-3xl font-black text-gray-900 tracking-tight tabular-nums leading-none"
                    style={{ fontFeatureSettings: '"tnum"' }}
                  >
                    {card.value}
                  </div>
                  <div className="text-sm font-medium text-gray-500 mt-1.5 leading-snug">
                    {card.title}
                  </div>
                  {card.change && (
                    <div className={`text-xs mt-2 flex items-center gap-1 font-medium ${
                      card.isUp ? 'text-emerald-600' : 'text-amber-600'
                    }`}>
                      <i className={`fas fa-arrow-${card.isUp ? 'up' : 'down'} text-[10px]`} />
                      {card.change}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Quick Actions ────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to={ROUTES.JOB_CREATE}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-hover hover:-translate-y-px hover:shadow-md transition-all duration-200 no-underline shadow-sm"
          >
            <i className="fas fa-plus-circle text-xs" />
            Post New Job
          </Link>
          <Link
            to={ROUTES.APPLICATIONS}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 hover:-translate-y-px hover:shadow-sm transition-all duration-200 no-underline"
          >
            <i className="fas fa-file-alt text-xs" />
            Review Applications
          </Link>
          <Link
            to={ROUTES.INTERVIEWS}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 hover:-translate-y-px hover:shadow-sm transition-all duration-200 no-underline"
          >
            <i className="fas fa-calendar-check text-xs" />
            View Interviews
          </Link>
        </div>

        {/* ── Recent Applications ───────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
          {/* Card header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-5 bg-primary rounded-full" />
              <h3 className="text-base font-bold text-gray-900">Recent Applications</h3>
              {recentApps && recentApps.length > 0 && (
                <span className="px-2 py-0.5 bg-primary/10 text-primary text-[11px] font-semibold rounded-full">
                  {recentApps.length}
                </span>
              )}
            </div>
            <Link
              to={ROUTES.APPLICATIONS}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-hover transition-colors no-underline group"
            >
              View All
              <i className="fas fa-arrow-right text-[10px] group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Table */}
          {appsLoading ? (
            <div className="p-6">
              <TableSkeleton rows={5} cols={5} />
            </div>
          ) : !recentApps?.length ? (
            <EmptyState
              icon="fa-inbox"
              title="No applications yet"
              description="When candidates apply for your jobs, they'll appear here."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-6 py-3 whitespace-nowrap">
                      Applicant
                    </th>
                    <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-6 py-3 whitespace-nowrap hidden sm:table-cell">
                      Job Position
                    </th>
                    <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-6 py-3 whitespace-nowrap">
                      AI Match
                    </th>
                    <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-6 py-3 whitespace-nowrap">
                      Status
                    </th>
                    <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-6 py-3 whitespace-nowrap hidden md:table-cell">
                      Applied
                    </th>
                    <th className="px-6 py-3 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {recentApps.map((app) => (
                    <tr
                      key={app.id}
                      className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors duration-150"
                    >
                      {/* Applicant */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 text-emerald-600 flex items-center justify-center text-xs font-bold shadow-sm shrink-0">
                            {getInitials(app.candidateName, app.candidateEmail)}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-gray-900 whitespace-nowrap truncate max-w-[220px]">
                              {app.candidateName || app.candidateEmail}
                            </div>
                            {app.candidateEmail && app.candidateEmail !== app.candidateName && (
                              <div className="text-xs text-gray-400 whitespace-nowrap truncate max-w-[220px]">
                                {app.candidateEmail}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Job */}
                      <td className="px-6 py-4 hidden sm:table-cell">
                        <span className="text-sm text-gray-600 whitespace-nowrap">
                          {app.jobTitle}
                        </span>
                      </td>

                      {/* AI Score */}
                      <td className="px-6 py-4">
                        <MatchScoreBadge score={(app.aiScore ?? 0) * 100} size="sm" />
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <StatusBadge status={app.status} size="sm" />
                      </td>

                      {/* Date */}
                      <td className="px-6 py-4 hidden md:table-cell">
                        <span className="text-sm text-gray-400 whitespace-nowrap">
                          {formatAppliedDate(app.appliedAt)}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="px-6 py-4">
                        <Link
                          to={`/applications/${app.id}`}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-emerald-50 hover:text-emerald-600 transition-all duration-150 hover:scale-110"
                          title="View application"
                        >
                          <i className="fas fa-expand text-sm" />
                        </Link>
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
  );
}
