import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StatsGrid from '../../components/common/StatsGrid';
import Badge from '../../components/common/Badge';
import ScoreBar from '../../components/common/ScoreBar';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import { applicationService } from '../../services/applicationService';
import type { ApplicationListItem, ApplicationStats, ApplicationStatus } from '../../types/application';

export default function ApplicationsPage() {
  const navigate = useNavigate();
  const [apps, setApps] = useState<ApplicationListItem[]>([]);
  const [stats, setStats] = useState<ApplicationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const statuses: ('' | ApplicationStatus)[] = ['', 'APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'REJECTED', 'HIRED', 'WITHDRAWN'];

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

  const handleWithdraw = async (id: string) => {
    if (!confirm('Are you sure you want to withdraw this application?')) return;
    try {
      await applicationService.withdraw(id);
      fetchData();
    } catch (err) { console.error(err); }
  };

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const statCards = [
    { label: 'Total Applied', value: stats?.totalApplied ?? 0, icon: 'fa-paper-plane', color: 'blue' },
    { label: 'In Screening', value: stats?.inScreening ?? 0, icon: 'fa-search', color: 'orange' },
    { label: 'Interview', value: stats?.inInterview ?? 0, icon: 'fa-calendar-check', color: 'purple' },
    { label: 'Offers', value: stats?.offers ?? 0, icon: 'fa-trophy', color: 'green' },
  ];

  return (
    <div className="space-y-6">
      <StatsGrid stats={statCards} />

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-border p-5 flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-text-light text-sm"></i>
            <input
              type="text"
              placeholder="Search by job title..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:border-primary"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <select
          className="px-4 py-2.5 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:border-primary"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          {statuses.filter(Boolean).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <LoadingSpinner />
      ) : apps.length === 0 ? (
        <EmptyState icon="fa-file-alt" title="No applications found" description="Start applying to jobs to see your applications here." action={{ label: 'Browse Jobs', onClick: () => navigate('/jobs') }} />
      ) : (
        <div className="bg-white rounded-2xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-surface">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Job Position</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Company</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider w-32">AI Score</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Applied</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {apps.map((app) => (
                  <tr key={app.id} className="hover:bg-surface/50 transition-colors">
                    <td className="px-5 py-4">
                      <button onClick={() => navigate(`/applications/${app.id}`)} className="text-sm font-semibold text-text hover:text-primary text-left">
                        {app.jobTitle}
                      </button>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-primary/10 rounded-lg flex items-center justify-center text-xs font-bold text-primary">{app.companyInitial}</div>
                        <span className="text-sm text-text-muted">{app.companyName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 w-32">
                      {app.aiScore != null ? <ScoreBar score={Math.round(app.aiScore)} size="sm" /> : <span className="text-xs text-text-light">—</span>}
                    </td>
                    <td className="px-5 py-4"><Badge value={app.status} /></td>
                    <td className="px-5 py-4 text-sm text-text-muted">{formatDate(app.appliedAt)}</td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => navigate(`/applications/${app.id}`)} className="w-8 h-8 rounded-lg hover:bg-surface text-text-muted hover:text-primary transition-colors" title="View">
                          <i className="fas fa-eye text-xs"></i>
                        </button>
                        {!['WITHDRAWN', 'HIRED', 'REJECTED'].includes(app.status) && (
                          <button onClick={() => handleWithdraw(app.id)} className="w-8 h-8 rounded-lg hover:bg-red-50 text-text-muted hover:text-red-500 transition-colors" title="Withdraw">
                            <i className="fas fa-times text-xs"></i>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
