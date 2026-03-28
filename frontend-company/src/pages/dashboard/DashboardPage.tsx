import { Link } from 'react-router-dom';
import { useOutletContext } from 'react-router-dom';
import Topbar from '../../components/layout/Topbar';
import { useDashboardStats, useRecentApplications } from '../../hooks/useDashboard';
import { ROUTES, STATUS_LABELS, STATUS_COLORS } from '../../constants';

export default function DashboardPage() {
  const { onMenuToggle } = useOutletContext<{ onMenuToggle: () => void }>();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: recentApps, isLoading: appsLoading } = useRecentApplications();

  const statCards = [
    { title: 'Total Jobs', value: stats?.totalJobs ?? '—', change: stats?.jobsTrend ? `${stats.jobsTrend}% this month` : '', icon: 'fa-briefcase', color: 'bg-emerald-100 text-emerald-600', isUp: true },
    { title: 'Active Applications', value: stats?.activeApplications ?? '—', change: stats?.applicationsTrend ? `${stats.applicationsTrend}% this week` : '', icon: 'fa-file-alt', color: 'bg-sky-100 text-sky-600', isUp: true },
    { title: 'Interviews This Week', value: stats?.interviewsThisWeek ?? '—', change: stats?.interviewsPending ? `${stats.interviewsPending} pending` : '', icon: 'fa-calendar-check', color: 'bg-amber-100 text-amber-600', isUp: false },
    { title: 'New Messages', value: stats?.newMessages ?? '—', change: stats?.messagesUnread ? `${stats.messagesUnread} unread` : '', icon: 'fa-comments', color: 'bg-red-100 text-red-500', isUp: true },
  ];

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600';
    if (score >= 60) return 'text-amber-500';
    return 'text-red-500';
  };

  const getScoreBarColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-500';
    if (score >= 60) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <>
      <Topbar title="Dashboard" onMenuToggle={onMenuToggle} />
      <div className="p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {statCards.map((card) => (
            <div key={card.title} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-50 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${card.color}`}>
                  <i className={`fas ${card.icon} text-lg`} />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm text-gray-500 font-medium">{card.title}</h4>
                  <div className="text-2xl font-bold text-gray-900 mt-1">{statsLoading ? '—' : card.value}</div>
                  {card.change && (
                    <div className={`text-xs mt-1 flex items-center gap-1 ${card.isUp ? 'text-emerald-500' : 'text-amber-500'}`}>
                      <i className={`fas ${card.isUp ? 'fa-arrow-up' : 'fa-arrow-down'}`} />
                      {card.change}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="flex gap-3 flex-wrap">
          <Link to={ROUTES.JOB_CREATE} className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-hover transition-all flex items-center gap-2 no-underline">
            <i className="fas fa-plus" /> Post New Job
          </Link>
          <Link to={ROUTES.APPLICATIONS} className="px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-all flex items-center gap-2 no-underline">
            <i className="fas fa-eye" /> Review Applications
          </Link>
          <Link to={ROUTES.INTERVIEWS} className="px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-all flex items-center gap-2 no-underline">
            <i className="fas fa-calendar-plus" /> View Interviews
          </Link>
        </div>

        {/* Recent Applications */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-50">
          <div className="flex items-center justify-between p-5 border-b border-gray-50">
            <h3 className="text-lg font-bold text-gray-900">Recent Applications</h3>
            <Link to={ROUTES.APPLICATIONS} className="text-sm text-primary font-medium hover:underline flex items-center gap-1 no-underline">
              View All <i className="fas fa-arrow-right text-xs" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">Applicant</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">Job Position</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">AI Score</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">Status</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">Applied</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {appsLoading ? (
                  <tr><td colSpan={6} className="text-center py-10 text-gray-400 text-sm">Loading...</td></tr>
                ) : !recentApps?.length ? (
                  <tr><td colSpan={6} className="text-center py-10 text-gray-400 text-sm">No recent applications</td></tr>
                ) : (
                  recentApps.map((app) => (
                    <tr key={app.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                            {app.applicantInitials}
                          </div>
                          <span className="text-sm font-medium text-gray-900">{app.applicantName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-600">{app.jobTitle}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-semibold ${getScoreColor(app.aiScore)}`}>{app.aiScore}%</span>
                          <div className="w-14 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${getScoreBarColor(app.aiScore)}`} style={{ width: `${app.aiScore}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[app.status] || 'bg-gray-100 text-gray-600'}`}>
                          {STATUS_LABELS[app.status] || app.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-500">{app.appliedDate}</td>
                      <td className="px-5 py-3.5">
                        <Link to={`/applications/${app.id}`} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
                          <i className="fas fa-eye" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
