import { useState, useMemo } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import Topbar from '../../components/layout/Topbar';
import { useInterviews, useInterviewDetail, useUpdateInterviewStatus } from '../../hooks/useInterviews';
import { ROUTES } from '../../constants';
import StatusBadge from '../../components/common/StatusBadge';
import InfoGrid from '../../components/common/InfoGrid';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';

type ViewMode = 'list' | 'calendar';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const EVENT_STYLE: Record<string, { bg: string; border: string; text: string }> = {
  PENDING:    { bg: '#fffbeb', border: '#f59e0b', text: '#92400e' },
  COMPLETED:  { bg: '#f0fdf4', border: '#22c55e', text: '#166534' },
  CANCELLED:  { bg: '#fef2f2', border: '#ef4444', text: '#991b1b' },
};

function calendarMatrix(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();
  const cells: { date: string; day: number; kind: 'prev' | 'curr' | 'next' }[] = [];
  for (let i = firstDay - 1; i >= 0; i--) {
    const d = daysInPrev - i;
    const m = month === 0 ? 11 : month - 1;
    const y = month === 0 ? year - 1 : year;
    cells.push({ date: `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`, day: d, kind: 'prev' });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`, day: d, kind: 'curr' });
  }
  const remaining = cells.length % 7 === 0 ? 0 : 7 - (cells.length % 7);
  for (let d = 1; d <= remaining; d++) {
    const m = month === 11 ? 0 : month + 1;
    const y = month === 11 ? year + 1 : year;
    cells.push({ date: `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`, day: d, kind: 'next' });
  }
  return cells;
}

function todayStr() {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
}

export default function InterviewsPage() {
  const { onMenuToggle } = useOutletContext<{ onMenuToggle: () => void }>();
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [detailId, setDetailId] = useState<string | null>(null);

  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());

  const { data: interviews, isLoading } = useInterviews();
  const { data: detail } = useInterviewDetail(detailId || '');
  const updateStatus = useUpdateInterviewStatus();

  const stats = useMemo(() => ({
    pending:   interviews?.filter((i) => i.status === 'PENDING').length   || 0,
    completed: interviews?.filter((i) => i.status === 'COMPLETED').length || 0,
    cancelled: interviews?.filter((i) => i.status === 'CANCELLED').length || 0,
  }), [interviews]);

  const cells = useMemo(() => calendarMatrix(calYear, calMonth), [calYear, calMonth]);
  const today = todayStr();

  const interviewsByDate = useMemo(() => {
    const map: Record<string, typeof interviews> = {};
    interviews?.forEach((iv) => {
      const d = iv.scheduledDate as string;
      if (!map[d]) map[d] = [];
      map[d]!.push(iv);
    });
    return map;
  }, [interviews]);

  function changeMonth(delta: number) {
    let m = calMonth + delta;
    let y = calYear;
    if (m > 11) { m = 0; y++; }
    if (m < 0)  { m = 11; y--; }
    setCalMonth(m);
    setCalYear(y);
  }

  function goToday() {
    setCalYear(now.getFullYear());
    setCalMonth(now.getMonth());
  }

  const handleStatusChange = (id: string, status: string) => {
    updateStatus.mutate({ id, status });
    setDetailId(null);
  };

  const editUrl = (id: string) => ROUTES.INTERVIEW_EDIT.replace(':id', id);

  const statCards = [
    { label: 'Pending',    value: stats.pending,   icon: 'fa-clock',        bg: 'from-amber-50 to-orange-50', border: 'border-amber-100/50',  iconBg: 'bg-amber-100',  iconColor: 'text-amber-600', blob: '#f59e0b' },
    { label: 'Completed',  value: stats.completed,  icon: 'fa-check-circle', bg: 'from-emerald-50 to-green-50',   border: 'border-emerald-100/50', iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600', blob: '#22c55e' },
    { label: 'Cancelled',  value: stats.cancelled,  icon: 'fa-times-circle', bg: 'from-red-50 to-pink-50',      border: 'border-red-100/50',      iconBg: 'bg-red-100',    iconColor: 'text-red-500', blob: '#ef4444' },
  ];

  return (
    <>
      <Topbar title="Interviews" onMenuToggle={onMenuToggle} />
      <div className="p-6 lg:p-8 max-w-screen-full mx-8 space-y-6">

        {/* Page Header */}
        <PageHeader
          title="Interview Schedule"
          description="Manage upcoming and past interviews"
          action={
            <div className="flex items-center gap-2">
              {/* View toggle */}
              <div className="tab-segmented">
                <button
                  className={viewMode === 'calendar' ? 'active' : ''}
                  onClick={() => setViewMode('calendar')}
                >
                  <i className="fas fa-calendar-alt mr-1.5" />
                  Calendar
                </button>
                <button
                  className={viewMode === 'list' ? 'active' : ''}
                  onClick={() => setViewMode('list')}
                >
                  <i className="fas fa-list mr-1.5" />
                  List
                </button>
              </div>
              <Link
                to={ROUTES.INTERVIEW_SCHEDULE}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-hover hover:-translate-y-px hover:shadow-md transition-all duration-200 no-underline shadow-sm"
              >
                <i className="fas fa-plus text-xs" />
                Schedule Interview
              </Link>
            </div>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {statCards.map((s, idx) => (
            <div
              key={s.label}
              className={`animate-fadeSlideUp group relative overflow-hidden bg-gradient-to-br ${s.bg} border ${s.border} rounded-2xl p-5 hover:-translate-y-0.5 transition-all duration-200 cursor-default`}
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              <div className="absolute -bottom-4 -right-4 w-20 h-20 rounded-full blur-2xl opacity-30" style={{ background: s.blob }} />
              <div className="flex items-center gap-4">
                <div className={`w-11 h-11 rounded-xl ${s.iconBg} ${s.iconColor} flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-200`}>
                  <i className={`fas ${s.icon} text-base`} />
                </div>
                <div>
                  <div className="text-3xl font-black text-gray-900 tracking-tight tabular-nums">{s.value}</div>
                  <div className="text-sm font-medium text-gray-500 mt-0.5">{s.label}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Calendar View */}
        {viewMode === 'calendar' && (
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 animate-fadeSlideUp">
            {/* Month navigation */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => changeMonth(-1)}
                  className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:border-primary hover:text-primary hover:scale-105 transition-all duration-150"
                >
                  <i className="fas fa-chevron-left text-xs" />
                </button>
                <h3 className="text-lg font-bold text-gray-900 min-w-[180px] text-center">
                  {MONTHS[calMonth]} {calYear}
                </h3>
                <button
                  onClick={() => changeMonth(1)}
                  className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:border-primary hover:text-primary hover:scale-105 transition-all duration-150"
                >
                  <i className="fas fa-chevron-right text-xs" />
                </button>
              </div>
              <button
                onClick={goToday}
                className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:border-primary hover:text-primary transition-all duration-150 flex items-center gap-2"
              >
                <i className="fas fa-calendar-day text-xs" />
                Today
              </button>
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 border border-gray-100 rounded-2xl overflow-hidden">
              {WEEKDAYS.map((d) => (
                <div key={d} className="py-3 text-center text-[11px] font-semibold text-gray-400 uppercase tracking-wider bg-gray-50/50 border-b border-gray-100">
                  {d}
                </div>
              ))}
              {cells.map((cell, idx) => {
                const isOther = cell.kind !== 'curr';
                const isToday = cell.date === today;
                const dayIvs = interviewsByDate[cell.date] || [];
                return (
                  <div
                    key={idx}
                    className={`
                      min-h-[100px] p-2 border-b border-r border-gray-50
                      ${(idx + 1) % 7 === 0 ? 'border-r-0' : ''}
                      ${isOther ? 'bg-gray-50/30' : isToday ? 'bg-primary/5' : 'bg-white'}
                      ${isOther ? 'opacity-50' : ''}
                    `}
                  >
                    <div className="mb-1.5">
                      {isToday ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-xs font-bold">
                          {cell.day}
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-gray-500">{cell.day}</span>
                      )}
                    </div>
                    {dayIvs.map((iv) => {
                      const st = EVENT_STYLE[iv.status] ?? EVENT_STYLE['PENDING'];
                      return (
                        <div
                          key={iv.id}
                          onClick={() => !isOther && setDetailId(iv.id)}
                          className="mb-1 py-1 px-1.5 rounded text-[11px] cursor-pointer transition-all duration-100 hover:translate-x-0.5 hover:shadow-sm"
                          style={{
                            background: st.bg,
                            borderLeft: `3px solid ${st.border}`,
                            color: st.text,
                          }}
                        >
                          <span className="font-bold block truncate">{iv.scheduledTimeDisplay as string}</span>
                          <span className="block truncate opacity-80">{iv.applicantName as string}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-5 mt-4">
              {[
                { label: 'Pending',   color: '#f59e0b' },
                { label: 'Completed',  color: '#22c55e' },
                { label: 'Cancelled', color: '#ef4444' },
              ].map((l) => (
                <div key={l.label} className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: l.color }} />
                  {l.label}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* List View */}
        {viewMode === 'list' && (
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden animate-fadeSlideUp">
            {isLoading ? (
              <div className="p-12 text-center text-gray-400 text-sm">Loading...</div>
            ) : !interviews?.length ? (
              <EmptyState
                icon="fa-calendar"
                title="No interviews scheduled"
                description="Schedule your first interview to get started."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      {['Candidate', 'Job Position', 'Date & Time', 'Type', 'Status', ''].map((h) => (
                        <th key={h} className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-6 py-3 whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {interviews.map((iv) => (
                      <tr
                        key={iv.id}
                        onClick={() => setDetailId(iv.id)}
                        className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors duration-150 cursor-pointer"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 text-emerald-600 flex items-center justify-center text-xs font-bold shadow-sm shrink-0">
                              {iv.applicantInitials as string}
                            </div>
                            <span className="text-sm font-semibold text-gray-900 whitespace-nowrap">{iv.applicantName as string}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-600 whitespace-nowrap">{iv.jobTitle}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-semibold text-gray-900">{iv.scheduledDate as string}</div>
                          <div className="text-xs text-gray-400">{iv.scheduledTimeDisplay as string}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                            iv.meetingType === 'ONLINE'
                              ? 'bg-blue-50 text-blue-600'
                              : 'bg-amber-50 text-amber-600'
                          }`}>
                            <i className={`fas ${iv.meetingType === 'ONLINE' ? 'fa-video' : 'fa-map-marker-alt'} text-[9px]`} />
                            {iv.meetingType === 'ONLINE' ? 'Online' : 'Offline'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={iv.status} size="sm" />
                        </td>
                        <td className="px-6 py-4">
                          <Link
                            to={editUrl(iv.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-all duration-150 hover:scale-105"
                            title="Edit"
                          >
                            <i className="fas fa-pen text-xs" />
                          </Link>
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

      {/* Detail Modal */}
      {detailId && detail && (
        <div
          onClick={() => setDetailId(null)}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-modal w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in"
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-5 bg-primary rounded-full" />
                <h3 className="text-base font-bold text-gray-900">Interview Details</h3>
              </div>
              <button
                onClick={() => setDetailId(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              >
                <i className="fas fa-times text-sm" />
              </button>
            </div>

            {/* Applicant header */}
            <div className="mx-6 mt-5 p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 text-emerald-600 flex items-center justify-center text-sm font-bold shrink-0">
                  {detail.applicantInitials as string}
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-900">{detail.applicantName as string}</div>
                  <div className="text-xs text-gray-400">{detail.applicantEmail as string}</div>
                  <div className="mt-1.5">
                    <StatusBadge status={detail.status} size="sm" />
                  </div>
                </div>
              </div>
            </div>

            {/* Info grid */}
            <div className="px-6 py-5">
              <InfoGrid
                items={[
                  { label: 'Position',     value: detail.jobTitle,                                      icon: 'fa-briefcase' },
                  { label: 'Date',        value: detail.scheduledDate as string,                         icon: 'fa-calendar' },
                  { label: 'Time',        value: detail.scheduledTimeDisplay as string,                   icon: 'fa-clock' },
                  { label: 'Meeting',     value: (detail.meetingType === 'ONLINE' ? 'Online' : 'Offline'), icon: 'fa-video' },
                ]}
                columns={2}
              />
              <div className="mt-3 bg-gray-50 rounded-xl p-4">
                <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                  {detail.meetingType === 'ONLINE' ? 'Meeting Link' : 'Location'}
                </div>
                <div className="text-sm font-semibold text-primary break-all">
                  {detail.meetingLink || '—'}
                </div>
              </div>
              {detail.notes && (
                <div className="mt-3 bg-gray-50 rounded-xl p-4">
                  <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Notes</div>
                  <div className="text-sm text-gray-600 leading-relaxed">{detail.notes}</div>
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100">
              {detail.status === 'PENDING' && (
                <>
                  <button
                    onClick={() => handleStatusChange(detail.id, 'COMPLETED')}
                    className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-semibold hover:bg-emerald-600 transition-colors flex items-center gap-2"
                  >
                    <i className="fas fa-check text-xs" />
                    Complete
                  </button>
                  <button
                    onClick={() => handleStatusChange(detail.id, 'CANCELLED')}
                    className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 transition-colors flex items-center gap-2"
                  >
                    <i className="fas fa-times text-xs" />
                    Cancel
                  </button>
                </>
              )}
              <button
                onClick={() => setDetailId(null)}
                className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              <Link
                to={editUrl(detail.id)}
                onClick={() => setDetailId(null)}
                className="px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors flex items-center gap-2 no-underline"
              >
                <i className="fas fa-pen text-xs" />
                Edit
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
