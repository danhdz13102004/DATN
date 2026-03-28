import { useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import Topbar from '../../components/layout/Topbar';
import { useInterviews, useInterviewDetail, useUpdateInterviewStatus } from '../../hooks/useInterviews';
import { ROUTES, STATUS_LABELS, STATUS_COLORS } from '../../constants';

export default function InterviewsPage() {
  const { onMenuToggle } = useOutletContext<{ onMenuToggle: () => void }>();
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [detailId, setDetailId] = useState<string | null>(null);
  const { data: interviews, isLoading } = useInterviews();
  const { data: detail } = useInterviewDetail(detailId || '');
  const updateStatus = useUpdateInterviewStatus();

  const stats = {
    pending: interviews?.filter((i) => i.status === 'PENDING').length || 0,
    completed: interviews?.filter((i) => i.status === 'COMPLETED').length || 0,
    cancelled: interviews?.filter((i) => i.status === 'CANCELLED').length || 0,
  };

  const handleStatusChange = (id: string, status: string) => {
    updateStatus.mutate({ id, status });
    setDetailId(null);
  };

  return (
    <>
      <Topbar title="Interviews" onMenuToggle={onMenuToggle} />
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Interview Management</h2>
            <p className="text-sm text-gray-500">Schedule and manage candidate interviews</p>
          </div>
          <Link to={ROUTES.INTERVIEW_SCHEDULE} className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-hover transition-all flex items-center gap-2 no-underline">
            <i className="fas fa-plus" /> Schedule Interview
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Pending', value: stats.pending, color: 'bg-amber-100 text-amber-600', icon: 'fa-clock' },
            { label: 'Completed', value: stats.completed, color: 'bg-emerald-100 text-emerald-600', icon: 'fa-check-circle' },
            { label: 'Cancelled', value: stats.cancelled, color: 'bg-red-100 text-red-600', icon: 'fa-times-circle' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color}`}><i className={`fas ${s.icon}`} /></div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{s.value}</div>
                <div className="text-xs text-gray-500">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* View Toggle */}
        <div className="flex gap-2">
          <button className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${viewMode === 'list' ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`} onClick={() => setViewMode('list')}>
            <i className="fas fa-list" /> List
          </button>
          <button className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${viewMode === 'calendar' ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`} onClick={() => setViewMode('calendar')}>
            <i className="fas fa-calendar-alt" /> Calendar
          </button>
        </div>

        {/* List View */}
        {viewMode === 'list' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-50 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50">
                  {['Candidate', 'Job Position', 'Date & Time', 'Type', 'Status', ''].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className="text-center py-10 text-gray-400 text-sm">Loading...</td></tr>
                ) : !interviews?.length ? (
                  <tr><td colSpan={6} className="text-center py-10 text-gray-400 text-sm">No interviews scheduled</td></tr>
                ) : (
                  interviews.map((iv) => (
                    <tr key={iv.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => setDetailId(iv.id)}>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">{iv.applicantInitials}</div>
                          <span className="text-sm font-medium text-gray-900">{iv.applicantName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-600">{iv.jobTitle}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-600">{iv.scheduledDate} at {iv.scheduledTime}</td>
                      <td className="px-5 py-3.5"><span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${iv.meetingType === 'ONLINE' ? 'bg-sky-100 text-sky-600' : 'bg-amber-100 text-amber-600'}`}>{iv.meetingType === 'ONLINE' ? '🖥️ Online' : '📍 Offline'}</span></td>
                      <td className="px-5 py-3.5"><span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[iv.status]}`}>{STATUS_LABELS[iv.status]}</span></td>
                      <td className="px-5 py-3.5">
                        <div className="flex gap-1">
                          <Link to={`/interviews/${iv.id}/edit`} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100" onClick={(e) => e.stopPropagation()}><i className="fas fa-pen" /></Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Calendar View */}
        {viewMode === 'calendar' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-50 p-6 text-center text-gray-400">
            <i className="fas fa-calendar-alt text-4xl mb-3 text-gray-200" />
            <p className="text-sm">Calendar view coming soon. Use list view to manage interviews.</p>
          </div>
        )}

        {/* Detail Modal */}
        {detailId && detail && (
          <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={() => setDetailId(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b border-gray-100">
                <h3 className="text-lg font-bold">Interview Details</h3>
                <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400" onClick={() => setDetailId(null)}><i className="fas fa-times" /></button>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">{detail.applicantInitials}</div>
                  <div>
                    <div className="font-semibold text-sm">{detail.applicantName}</div>
                    <div className="text-xs text-gray-400">{detail.applicantEmail}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-xs text-gray-400 uppercase">Job</span><p className="font-medium">{detail.jobTitle}</p></div>
                  <div><span className="text-xs text-gray-400 uppercase">Status</span><p><span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[detail.status]}`}>{STATUS_LABELS[detail.status]}</span></p></div>
                  <div><span className="text-xs text-gray-400 uppercase">Date</span><p className="font-medium">{detail.scheduledDate}</p></div>
                  <div><span className="text-xs text-gray-400 uppercase">Time</span><p className="font-medium">{detail.scheduledTime}</p></div>
                  <div><span className="text-xs text-gray-400 uppercase">Type</span><p className="font-medium">{detail.meetingType}</p></div>
                  <div><span className="text-xs text-gray-400 uppercase">Link/Location</span><p className="font-medium text-primary break-all">{detail.meetingLink || '—'}</p></div>
                </div>
                {detail.notes && <div><span className="text-xs text-gray-400 uppercase">Notes</span><p className="text-sm text-gray-600 mt-1">{detail.notes}</p></div>}
              </div>
              <div className="flex justify-end gap-2 p-5 border-t border-gray-100">
                {detail.status === 'PENDING' && (
                  <>
                    <button className="px-4 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-semibold hover:bg-emerald-600 flex items-center gap-2" onClick={() => handleStatusChange(detail.id, 'COMPLETED')}>
                      <i className="fas fa-check" /> Complete
                    </button>
                    <button className="px-4 py-2.5 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 flex items-center gap-2" onClick={() => handleStatusChange(detail.id, 'CANCELLED')}>
                      <i className="fas fa-times" /> Cancel
                    </button>
                  </>
                )}
                <Link to={`/interviews/${detail.id}/edit`} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 flex items-center gap-2 no-underline text-gray-700">
                  <i className="fas fa-pen" /> Reschedule
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
