import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StatsGrid from '../../components/common/StatsGrid';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { dashboardService } from '../../services/dashboardService';
import type { DashboardStats } from '../../types/jobseeker';
import type { ApplicationListItem } from '../../types/application';
import type { InterviewListItem } from '../../types/interview';

// ---- Shared design tokens ----
const card: React.CSSProperties = {
  background: '#fff', border: '1px solid #eef0f4',
  borderRadius: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  marginBottom: '24px'
};
const cardHeader: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '20px 24px', borderBottom: '1px solid #eef0f4',
};
const cardTitle: React.CSSProperties = {
  fontSize: '1.05rem', fontWeight: 600, color: '#1a1d26', margin: 0,
};
const theadTh: React.CSSProperties = {
  padding: '10px 16px', textAlign: 'left' as const,
  fontSize: '0.72rem', fontWeight: 600,
  textTransform: 'uppercase' as const, letterSpacing: '0.05em',
  color: '#8b92a8', borderBottom: '1px solid #e2e6ed',
  background: '#f4f6fa', whiteSpace: 'nowrap' as const,
};
const tbodyTd: React.CSSProperties = {
  padding: '13px 16px', fontSize: '0.88rem',
  borderBottom: '1px solid #eef0f4', color: '#1a1d26', verticalAlign: 'middle'
};

// ---- Status badge ----
function StatusBadge({ value }: { value: string }) {
  const styleMap: Record<string, [string, string]> = {
    APPLIED:    ['rgba(66,135,245,0.1)',  '#2b6de0'],
    SCREENING:  ['rgba(59,130,246,0.1)',  '#3b82f6'],
    INTERVIEW:  ['rgba(245,158,11,0.1)', '#b45309'],
    OFFER:      ['rgba(34,197,94,0.1)',  '#16a34a'],
    REJECTED:   ['rgba(239,68,68,0.1)',  '#ef4444'],
    PENDING:    ['rgba(245,158,11,0.1)', '#b45309'],
    ONLINE:     ['rgba(59,130,246,0.1)',  '#3b82f6'],
    OFFLINE:    ['rgba(139,92,246,0.1)', '#6d28d9'],
    HYBRID:     ['rgba(139,92,246,0.1)', '#6d28d9'],
  };
  const [bg, color] = styleMap[value?.toUpperCase()] ?? ['rgba(107,114,128,0.1)', '#6b7280'];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 10px', borderRadius: '6px',
      fontSize: '0.75rem', fontWeight: 600,
      background: bg, color,
    }}>
      {value}
    </span>
  );
}

// ---- Score bar ----
function ScoreBar({ score }: { score: number }) {
  const color = score >= 80 ? '#4287f5' : score >= 60 ? '#f59e0b' : '#ef4444';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ fontWeight: 600, color, fontSize: '0.88rem', minWidth: '36px' }}>{score}%</span>
      <div style={{ width: '60px', height: '6px', background: '#eef0f4', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{ width: `${score}%`, height: '100%', background: color, borderRadius: '3px' }} />
      </div>
    </div>
  );
}

// ---- Avatar circle (company initial) ----
function CompanyAvatar({ initial, color = '#2b6de0', bg = 'rgba(66,135,245,0.08)' }: { initial: string; color?: string; bg?: string }) {
  return (
    <div style={{
      width: '28px', height: '28px', borderRadius: '50%',
      background: bg, color, display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      fontSize: '0.78rem', fontWeight: 700, flexShrink: 0,
    }}>
      {initial}
    </div>
  );
}

// ---- Ghost button ----
function BtnGhost({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        padding: '6px 12px', border: 'none', cursor: 'pointer',
        background: hov ? '#f4f6fa' : 'transparent',
        color: hov ? '#1a1d26' : '#5f6780',
        borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500,
        transition: 'all 0.2s', fontFamily: 'inherit',
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {children}
    </button>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentApps, setRecentApps] = useState<ApplicationListItem[]>([]);
  const [upcomingInterviews, setUpcomingInterviews] = useState<InterviewListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      dashboardService.getStats(),
      dashboardService.getRecentApplications(),
      dashboardService.getUpcomingInterviews(),
    ]).then(([s, apps, interviews]) => {
      setStats(s);
      setRecentApps(apps);
      setUpcomingInterviews(interviews);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const statCards = [
    { label: 'Jobs Applied',         value: stats?.jobsApplied ?? 0,         icon: 'fa-paper-plane',    color: 'green' as const, change: '0 this week' },
    { label: 'Interviews',           value: stats?.interviewsCount ?? 0,      icon: 'fa-calendar-check', color: 'blue'  as const, change: `${stats?.upcomingInterviews ?? 0} upcoming` },
    { label: 'Upcoming Interviews',  value: stats?.upcomingInterviews ?? 0,   icon: 'fa-clock',          color: 'orange' as const },
    { label: 'Profile Views',        value: 0,                                icon: 'fa-eye',            color: 'red'   as const, change: '—' },
  ];

  const EmptyRow = ({ cols, icon, msg }: { cols: number; icon: string; msg: string }) => (
    <tr>
      <td colSpan={cols} style={{ padding: '48px 24px', textAlign: 'center', color: '#8b92a8' }}>
        <i className={`fas ${icon}`} style={{ fontSize: '2.5rem', opacity: 0.2, display: 'block', marginBottom: '12px' }} />
        <div style={{ fontSize: '0.9rem', fontWeight: 500, color: '#1a1d26', marginBottom: '4px' }}>{msg}</div>
      </td>
    </tr>
  );

  return (
    <div>
      {/* Stats */}
      <StatsGrid stats={statCards} />

      {/* Quick Actions */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '28px' }}>
        {[
          { label: 'Browse Jobs', icon: 'fa-search', path: '/jobs', primary: true },
          { label: 'Upload Resume', icon: 'fa-upload', path: '/resumes', primary: false },
          { label: 'View Applications', icon: 'fa-eye', path: '/applications', primary: false },
        ].map(({ label, icon, path, primary }) => (
          <button
            key={label}
            onClick={() => navigate(path)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 20px', borderRadius: '8px', cursor: 'pointer',
              fontSize: '0.88rem', fontWeight: 600, fontFamily: 'inherit',
              border: primary ? 'none' : '1.5px solid #e2e6ed',
              background: primary ? '#4287f5' : '#fff',
              color: primary ? '#fff' : '#5f6780',
              boxShadow: primary ? '0 2px 8px rgba(66,135,245,0.25)' : 'none',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement;
              if (primary) { el.style.background = '#2b6de0'; el.style.transform = 'translateY(-1px)'; }
              else { el.style.background = '#f4f6fa'; el.style.color = '#1a1d26'; el.style.borderColor = '#8b92a8'; }
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement;
              if (primary) { el.style.background = '#4287f5'; el.style.transform = 'none'; }
              else { el.style.background = '#fff'; el.style.color = '#5f6780'; el.style.borderColor = '#e2e6ed'; }
            }}
          >
            <i className={`fas ${icon}`} /> {label}
          </button>
        ))}
      </div>

      {/* Recent Applications */}
      <div style={card}>
        <div style={cardHeader}>
          <h3 style={cardTitle}>Recent Applications</h3>
          <BtnGhost onClick={() => navigate('/applications')}>
            View All <i className="fas fa-arrow-right" style={{ fontSize: '0.7rem' }} />
          </BtnGhost>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                {['Job Position', 'Company', 'AI Score', 'Status', 'Applied', ''].map(h => (
                  <th key={h} style={theadTh}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentApps.length === 0
                ? <EmptyRow cols={6} icon="fa-file-alt" msg="No applications yet" />
                : recentApps.map(app => (
                  <tr
                    key={app.id}
                    style={{ cursor: 'pointer', transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#f8f9fb'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                    onClick={() => navigate(`/applications/${app.id}`)}
                  >
                    <td style={tbodyTd}><strong>{app.jobTitle}</strong></td>
                    <td style={tbodyTd}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CompanyAvatar initial={app.companyInitial ?? app.companyName?.charAt(0) ?? '?'} />
                        <span style={{ color: '#5f6780' }}>{app.companyName}</span>
                      </div>
                    </td>
                    <td style={tbodyTd}>
                      {app.aiScore != null
                        ? <ScoreBar score={Math.round(app.aiScore)} />
                        : <span style={{ color: '#8b92a8' }}>—</span>}
                    </td>
                    <td style={tbodyTd}><StatusBadge value={app.status} /></td>
                    <td style={{ ...tbodyTd, color: '#8b92a8' }}>{formatDate(app.appliedAt)}</td>
                    <td style={tbodyTd}>
                      <button
                        style={{ width: '30px', height: '30px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#8b92a8', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#f4f6fa'; (e.currentTarget as HTMLElement).style.color = '#4287f5'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#8b92a8'; }}
                      >
                        <i className="fas fa-eye" style={{ fontSize: '0.85rem' }} />
                      </button>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>

      {/* Upcoming Interviews */}
      <div style={card}>
        <div style={cardHeader}>
          <h3 style={cardTitle}>Upcoming Interviews</h3>
          <BtnGhost onClick={() => navigate('/interviews')}>
            View All <i className="fas fa-arrow-right" style={{ fontSize: '0.7rem' }} />
          </BtnGhost>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                {['Job Position', 'Company', 'Date & Time', 'Type', 'Status', ''].map(h => (
                  <th key={h} style={theadTh}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {upcomingInterviews.length === 0
                ? <EmptyRow cols={6} icon="fa-calendar" msg="No upcoming interviews" />
                : upcomingInterviews.map(iv => (
                  <tr
                    key={iv.id}
                    style={{ transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#f8f9fb'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                  >
                    <td style={tbodyTd}><strong>{iv.jobTitle}</strong></td>
                    <td style={{ ...tbodyTd, color: '#5f6780' }}>{iv.companyName}</td>
                    <td style={tbodyTd}>
                      <span style={{ color: '#5f6780' }}>
                        <i className="fas fa-clock" style={{ color: '#8b92a8', marginRight: '6px' }} />
                        {formatDate(iv.scheduledTime)} — {formatTime(iv.scheduledTime)}
                      </span>
                    </td>
                    <td style={tbodyTd}><StatusBadge value={iv.meetingType} /></td>
                    <td style={tbodyTd}><StatusBadge value="PENDING" /></td>
                    <td style={tbodyTd}>
                      {iv.meetingType === 'ONLINE' ? (
                        <button style={{
                          display: 'flex', alignItems: 'center', gap: '6px',
                          padding: '6px 14px', background: '#4287f5', color: '#fff',
                          border: 'none', borderRadius: '6px', cursor: 'pointer',
                          fontSize: '0.82rem', fontWeight: 600, fontFamily: 'inherit',
                          boxShadow: '0 2px 8px rgba(66,135,245,0.25)',
                        }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#2b6de0'}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#4287f5'}
                        >
                          <i className="fas fa-video" /> Join
                        </button>
                      ) : (
                        <button style={{
                          display: 'flex', alignItems: 'center', gap: '6px',
                          padding: '6px 14px', background: '#fff', color: '#5f6780',
                          border: '1.5px solid #e2e6ed', borderRadius: '6px', cursor: 'pointer',
                          fontSize: '0.82rem', fontWeight: 600, fontFamily: 'inherit',
                        }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#f4f6fa'; (e.currentTarget as HTMLElement).style.color = '#1a1d26'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#fff'; (e.currentTarget as HTMLElement).style.color = '#5f6780'; }}
                        >
                          <i className="fas fa-map-marker-alt" /> Directions
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
