import { useState, useMemo } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import Topbar from '../../components/layout/Topbar';
import { useInterviews, useInterviewDetail, useUpdateInterviewStatus } from '../../hooks/useInterviews';
import { ROUTES, STATUS_LABELS, STATUS_COLORS } from '../../constants';

// ── Types ─────────────────────────────────────────────────
type ViewMode = 'list' | 'calendar';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ── Calendar Event color by status ───────────────────────
const EVENT_STYLE: Record<string, { bg: string; border: string; text: string }> = {
  PENDING:   { bg: '#fffbeb', border: '#f59e0b', text: '#92400e' },
  COMPLETED: { bg: '#f0fdf4', border: '#22c55e', text: '#166534' },
  CANCELLED: { bg: '#fef2f2', border: '#ef4444', text: '#991b1b' },
};

// ── Helpers ───────────────────────────────────────────────
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

// ── Component ─────────────────────────────────────────────
export default function InterviewsPage() {
  const { onMenuToggle } = useOutletContext<{ onMenuToggle: () => void }>();

  const [viewMode, setViewMode]   = useState<ViewMode>('calendar');
  const [detailId, setDetailId]   = useState<string | null>(null);

  const now = new Date();
  const [calYear, setCalYear]   = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());

  const { data: interviews, isLoading } = useInterviews();
  const { data: detail }                = useInterviewDetail(detailId || '');
  const updateStatus                    = useUpdateInterviewStatus();

  // ── Stats ──────────────────────────────────────────────
  const stats = useMemo(() => ({
    pending:   interviews?.filter((i) => i.status === 'PENDING').length   || 0,
    completed: interviews?.filter((i) => i.status === 'COMPLETED').length || 0,
    cancelled: interviews?.filter((i) => i.status === 'CANCELLED').length || 0,
  }), [interviews]);

  // ── Calendar ───────────────────────────────────────────
  const cells = useMemo(() => calendarMatrix(calYear, calMonth), [calYear, calMonth]);
  const today  = todayStr();

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

  // ── Status handlers ────────────────────────────────────
  const handleStatusChange = (id: string, status: string) => {
    updateStatus.mutate({ id, status });
    setDetailId(null);
  };

  // ── Build edit URL ─────────────────────────────────────
  const editUrl = (id: string) => ROUTES.INTERVIEW_EDIT.replace(':id', id);

  // ══════════════════════════════════════════════════════
  return (
    <>
      <Topbar title="Interviews" onMenuToggle={onMenuToggle} />

      {/* ── Centered page wrapper ────────────────────── */}
      <div style={{ padding: '24px 24px 48px' }}>

        {/* ── Page Header ─────────────────────────────── */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', margin: 0 }}>Interview Schedule</h2>
            <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: '2px 0 0' }}>Manage upcoming and past interviews</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* View toggle */}
            <div style={{ display: 'flex', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
              {(['calendar', 'list'] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  style={{
                    padding: '7px 14px',
                    border: 'none',
                    borderRight: mode === 'calendar' ? '1px solid #e5e7eb' : 'none',
                    background: viewMode === mode ? '#11d134' : '#fff',
                    color: viewMode === mode ? '#fff' : '#6b7280',
                    fontSize: '0.82rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s',
                  }}
                >
                  <i className={`fas fa-${mode === 'calendar' ? 'calendar-alt' : 'list'}`} />
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
            <Link
              to={ROUTES.INTERVIEW_SCHEDULE}
              style={{
                padding: '8px 16px',
                background: '#11d134',
                color: '#fff',
                borderRadius: '10px',
                fontSize: '0.85rem',
                fontWeight: 600,
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <i className="fas fa-plus" /> Schedule Interview
            </Link>
          </div>
        </div>

        {/* ── Stats ───────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '32px', marginBottom: '24px' }}>
          {[
            { label: 'Pending',   value: stats.pending,   icon: 'fa-clock',        iconBg: '#fffbeb', iconColor: '#f59e0b' },
            { label: 'Completed', value: stats.completed, icon: 'fa-check-circle', iconBg: '#f0fdf4', iconColor: '#22c55e' },
            { label: 'Cancelled', value: stats.cancelled, icon: 'fa-times-circle', iconBg: '#fef2f2', iconColor: '#ef4444' },
          ].map((s) => (
            <div key={s.label} style={{ background: '#fff', borderRadius: '16px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: s.iconBg, color: s.iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className={`fas ${s.icon}`} />
              </div>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827', lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '2px' }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ══════════════════════════════════════════════
            CALENDAR VIEW
        ══════════════════════════════════════════════ */}
        {viewMode === 'calendar' && (
          <div style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f3f4f6', padding: '20px' }}>
            {/* Month navigation */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  onClick={() => changeMonth(-1)}
                  style={{ width: '34px', height: '34px', border: '1px solid #e5e7eb', background: '#fff', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280', transition: 'all 0.15s' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#11d134'; (e.currentTarget as HTMLButtonElement).style.color = '#11d134'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#e5e7eb'; (e.currentTarget as HTMLButtonElement).style.color = '#6b7280'; }}
                >
                  <i className="fas fa-chevron-left" style={{ fontSize: '0.75rem' }} />
                </button>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827', minWidth: '180px', textAlign: 'center', margin: 0 }}>
                  {MONTHS[calMonth]} {calYear}
                </h3>
                <button
                  onClick={() => changeMonth(1)}
                  style={{ width: '34px', height: '34px', border: '1px solid #e5e7eb', background: '#fff', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280', transition: 'all 0.15s' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#11d134'; (e.currentTarget as HTMLButtonElement).style.color = '#11d134'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#e5e7eb'; (e.currentTarget as HTMLButtonElement).style.color = '#6b7280'; }}
                >
                  <i className="fas fa-chevron-right" style={{ fontSize: '0.75rem' }} />
                </button>
              </div>
              <button
                onClick={goToday}
                style={{ padding: '6px 14px', border: '1px solid #e5e7eb', background: '#fff', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 500, color: '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <i className="fas fa-calendar-day" /> Today
              </button>
            </div>

            {/* Calendar grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', border: '1px solid #f3f4f6', borderRadius: '12px', overflow: 'hidden' }}>
              {/* Day headers */}
              {WEEKDAYS.map((d) => (
                <div key={d} style={{ padding: '10px 6px', textAlign: 'center', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af', background: '#f9fafb', borderBottom: '1px solid #f3f4f6' }}>
                  {d}
                </div>
              ))}

              {/* Day cells */}
              {cells.map((cell, idx) => {
                const isOther = cell.kind !== 'curr';
                const isToday = cell.date === today;
                const dayIvs  = interviewsByDate[cell.date] || [];

                return (
                  <div
                    key={idx}
                    style={{
                      minHeight: '110px',
                      padding: '8px',
                      borderRight: (idx + 1) % 7 === 0 ? 'none' : '1px solid #f3f4f6',
                      borderBottom: '1px solid #f3f4f6',
                      background: isOther ? '#fafafa' : isToday ? '#f0fdf4' : '#fff',
                      opacity: isOther ? 0.45 : 1,
                      position: 'relative',
                    }}
                  >
                    {/* Day number */}
                    <div style={{ marginBottom: '6px' }}>
                      {isToday ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '50%', background: '#11d134', color: '#fff', fontSize: '0.78rem', fontWeight: 700 }}>
                          {cell.day}
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#6b7280' }}>{cell.day}</span>
                      )}
                    </div>

                    {/* Events */}
                    {dayIvs.map((iv) => {
                      const st = EVENT_STYLE[iv.status] ?? EVENT_STYLE['PENDING'];
                      return (
                        <div
                          key={iv.id}
                          onClick={() => !isOther && setDetailId(iv.id)}
                          style={{
                            padding: '4px 7px',
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                            marginBottom: '3px',
                            cursor: 'pointer',
                            background: st.bg,
                            borderLeft: `3px solid ${st.border}`,
                            color: st.text,
                            lineHeight: 1.3,
                            transition: 'transform 0.1s, box-shadow 0.1s',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateX(2px)'; e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.1)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
                        >
                          <span style={{ fontWeight: 600, display: 'block', marginBottom: '1px' }}>{iv.scheduledTimeDisplay as string}</span>
                          <span style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{iv.applicantName as string}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: '16px', marginTop: '14px', flexWrap: 'wrap' }}>
              {[
                { label: 'Pending',   color: '#f59e0b' },
                { label: 'Completed', color: '#22c55e' },
                { label: 'Cancelled', color: '#ef4444' },
              ].map((l) => (
                <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#6b7280' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: l.color, display: 'inline-block' }} />
                  {l.label}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════
            LIST VIEW
        ══════════════════════════════════════════════ */}
        {viewMode === 'list' && (
          <div style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f3f4f6', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                  {['Candidate', 'Job Position', 'Date & Time', 'Type', 'Status', ''].map((h) => (
                    <th key={h} style={{ textAlign: 'left', fontSize: '0.72rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '12px 20px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#9ca3af', fontSize: '0.85rem' }}>Loading…</td></tr>
                ) : !interviews?.length ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#9ca3af', fontSize: '0.85rem' }}>No interviews scheduled</td></tr>
                ) : (
                  interviews.map((iv) => (
                    <tr
                      key={iv.id}
                      onClick={() => setDetailId(iv.id)}
                      style={{ borderBottom: '1px solid #f9fafb', cursor: 'pointer', transition: 'background 0.1s' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f9fafb')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>
                            {iv.applicantInitials as string}
                          </div>
                          <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#111827' }}>{iv.applicantName as string}</span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 20px', fontSize: '0.875rem', color: '#4b5563' }}>{iv.jobTitle}</td>
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: 550, color: '#111827' }}>{iv.scheduledDate as string}</div>
                        <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '1px' }}>{iv.scheduledTimeDisplay as string}</div>
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <span style={{ padding: '3px 10px', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 600, background: iv.meetingType === 'ONLINE' ? '#e0f2fe' : '#fef9c3', color: iv.meetingType === 'ONLINE' ? '#0369a1' : '#92400e' }}>
                          {iv.meetingType === 'ONLINE' ? '🖥️ Online' : '📍 Offline'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <span style={{ padding: '3px 10px', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 600 }} className={STATUS_COLORS[iv.status]}>
                          {STATUS_LABELS[iv.status]}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <Link
                          to={editUrl(iv.id)}
                          onClick={(e) => e.stopPropagation()}
                          style={{ width: '32px', height: '32px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', color: '#9ca3af', textDecoration: 'none', transition: 'background 0.1s' }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = '#f3f4f6')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          <i className="fas fa-pen" style={{ fontSize: '0.75rem' }} />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════
          DETAIL MODAL (fixed, centered overlay)
      ══════════════════════════════════════════════ */}
      {detailId && detail && (
        <div
          onClick={() => setDetailId(null)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.45)',
            zIndex: 60,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: '20px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
              width: '100%',
              maxWidth: '560px',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            {/* Modal header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #f3f4f6' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#111827', margin: 0 }}>Interview Details</h3>
              <button
                onClick={() => setDetailId(null)}
                style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#6b7280', transition: 'background 0.1s' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#f3f4f6')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <i className="fas fa-times" />
              </button>
            </div>

            {/* Modal body */}
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Applicant header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px', background: '#f9fafb', borderRadius: '12px' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.95rem', fontWeight: 700, flexShrink: 0 }}>
                  {detail.applicantInitials as string}
                </div>
                <div>
                  <div style={{ fontSize: '1rem', fontWeight: 650, color: '#111827' }}>{detail.applicantName as string}</div>
                  <div style={{ fontSize: '0.82rem', color: '#6b7280', marginTop: '1px' }}>{detail.applicantEmail as string}</div>
                  <div style={{ marginTop: '4px' }}>
                    <span style={{ padding: '2px 10px', borderRadius: '99px', fontSize: '0.72rem', fontWeight: 600 }} className={STATUS_COLORS[detail.status]}>
                      {STATUS_LABELS[detail.status]}
                    </span>
                  </div>
                </div>
              </div>

              {/* Detail grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {[
                  { label: 'Position', value: detail.jobTitle },
                  { label: 'Date', value: detail.scheduledDate as string },
                  { label: 'Time', value: detail.scheduledTimeDisplay as string },
                  { label: 'Meeting Type', value: detail.meetingType === 'ONLINE' ? '🖥️ Online' : '📍 Offline' },
                ].map((item) => (
                  <div key={item.label} style={{ padding: '12px', background: '#f9fafb', borderRadius: '10px' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af', marginBottom: '4px' }}>{item.label}</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 550, color: '#111827' }}>{item.value}</div>
                  </div>
                ))}
                <div style={{ gridColumn: '1 / -1', padding: '12px', background: '#f9fafb', borderRadius: '10px' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af', marginBottom: '4px' }}>
                    {detail.meetingType === 'ONLINE' ? 'Meeting Link' : 'Location'}
                  </div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 550, color: '#11d134', wordBreak: 'break-all' }}>
                    {detail.meetingLink || '—'}
                  </div>
                </div>
              </div>

              {/* Notes */}
              {detail.notes && (
                <div style={{ padding: '12px', background: '#f9fafb', borderRadius: '10px' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af', marginBottom: '6px' }}>Notes</div>
                  <div style={{ fontSize: '0.875rem', color: '#4b5563', lineHeight: 1.6 }}>{detail.notes}</div>
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', padding: '16px 24px', borderTop: '1px solid #f3f4f6' }}>
              {detail.status === 'PENDING' && (
                <>
                  <button
                    onClick={() => handleStatusChange(detail.id, 'COMPLETED')}
                    style={{ padding: '8px 16px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <i className="fas fa-check" /> Complete
                  </button>
                  <button
                    onClick={() => handleStatusChange(detail.id, 'CANCELLED')}
                    style={{ padding: '8px 16px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <i className="fas fa-times" /> Cancel
                  </button>
                </>
              )}
              <button
                onClick={() => setDetailId(null)}
                style={{ padding: '8px 16px', background: '#fff', color: '#374151', border: '1px solid #e5e7eb', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer' }}
              >
                Close
              </button>
              <Link
                to={editUrl(detail.id)}
                onClick={() => setDetailId(null)}
                style={{ padding: '8px 16px', background: '#111827', color: '#fff', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <i className="fas fa-pen" /> Edit
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
