import { useEffect, useState } from 'react';
import StatsGrid from '../../components/common/StatsGrid';
import Badge from '../../components/common/Badge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import { interviewService } from '../../services/interviewService';
import type { InterviewListItem, InterviewStats } from '../../types/interview';

export default function InterviewsPage() {
  const [interviews, setInterviews] = useState<InterviewListItem[]>([]);
  const [stats, setStats] = useState<InterviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [meetingTypeFilter, setMeetingTypeFilter] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      interviewService.listMyInterviews({ status: statusFilter || undefined, meetingType: meetingTypeFilter || undefined }),
      interviewService.getStats(),
    ]).then(([res, s]) => {
      setInterviews(res.data ?? []);
      setStats(s);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [statusFilter, meetingTypeFilter]);

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const formatTime = (iso: string) => new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const statCards = [
    { label: 'Upcoming', value: stats?.upcoming ?? 0, icon: 'fa-clock', color: 'blue' as const },
    { label: 'Completed', value: stats?.completed ?? 0, icon: 'fa-check-circle', color: 'green' as const },
    { label: 'Cancelled', value: stats?.cancelled ?? 0, icon: 'fa-times-circle', color: 'red' as const },
  ];

  return (
    <div className="space-y-6">
      <StatsGrid stats={statCards} />

      <div className="bg-white rounded-2xl border border-border p-5 flex flex-wrap gap-3">
        <select
          className="px-4 py-2.5 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:border-primary"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>

        <select
          className="px-4 py-2.5 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:border-primary"
          value={meetingTypeFilter}
          onChange={(e) => setMeetingTypeFilter(e.target.value)}
        >
          <option value="">All Types</option>
          <option value="ONLINE">Online</option>
          <option value="OFFLINE">Offline</option>
        </select>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : interviews.length === 0 ? (
        <EmptyState icon="fa-calendar" title="No interviews found" description="Your scheduled interviews will appear here." />
      ) : (
        <div className="bg-white rounded-2xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-surface">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Job Position</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Company</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Date & Time</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Type</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {interviews.map((i) => (
                  <tr key={i.id} className="hover:bg-surface/50 transition-colors">
                    <td className="px-5 py-4 text-sm font-semibold text-text">{i.jobTitle}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-primary/10 rounded-lg flex items-center justify-center text-xs font-bold text-primary">{i.companyInitial}</div>
                        <span className="text-sm text-text-muted">{i.companyName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm font-medium text-text">{formatDate(i.scheduledTime)}</p>
                      <p className="text-xs text-text-muted">{formatTime(i.scheduledTime)}</p>
                    </td>
                    <td className="px-5 py-4"><Badge value={i.meetingType} /></td>
                    <td className="px-5 py-4"><Badge value={i.status} /></td>
                    <td className="px-5 py-4 text-sm text-text-muted max-w-[200px] truncate">{i.note || '—'}</td>
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
