import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { dashboardService } from '../../services/dashboardService';
import type { DashboardStats } from '../../types/jobseeker';
import type { ApplicationListItem } from '../../types/application';
import type { InterviewListItem } from '../../types/interview';

// ─────────────────────────────────────────────
// STATUS BADGE
// ─────────────────────────────────────────────
function StatusBadge({ value }: { value: string }) {
  const styleMap: Record<string, { bg: string; color: string; dot: string }> = {
    APPLIED:    { bg: '#EFF6FF', color: '#1E40AF', dot: '#3B82F6' },
    SCREENING:  { bg: '#FEF3C7', color: '#92400E', dot: '#F59E0B' },
    INTERVIEW:  { bg: '#EDE9FE', color: '#5B21B6', dot: '#8B5CF6' },
    OFFER:      { bg: '#D1FAE5', color: '#065F46', dot: '#10B981' },
    REJECTED:   { bg: '#FEE2E2', color: '#991B1B', dot: '#EF4444' },
    WITHDRAWN:  { bg: '#F3F4F6', color: '#6B7280', dot: '#9CA3AF' },
    PENDING:    { bg: '#FEF3C7', color: '#92400E', dot: '#F59E0B' },
    ONLINE:     { bg: '#DBEAFE', color: '#1E40AF', dot: '#3B82F6' },
    OFFLINE:    { bg: '#EDE9FE', color: '#5B21B6', dot: '#8B5CF6' },
    HYBRID:     { bg: '#FEF3C7', color: '#92400E', dot: '#F59E0B' },
  };
  const s = styleMap[value?.toUpperCase()] ?? { bg: '#F3F4F6', color: '#6B7280', dot: '#9CA3AF' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 10px', borderRadius: 8,
      fontSize: '0.75rem', fontWeight: 600,
      background: s.bg, color: s.color,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot }} />
      {value}
    </span>
  );
}

// ─────────────────────────────────────────────
// COMPANY AVATAR
// ─────────────────────────────────────────────
function CompanyAvatar({ initial, color = '#2563EB', bg = '#DBEAFE' }: { initial: string; color?: string; bg?: string }) {
  return (
    <div style={{
      width: 36, height: 36, borderRadius: 10,
      background: `linear-gradient(135deg, ${bg}, ${bg}dd)`,
      color, display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '0.85rem', fontWeight: 700, flexShrink: 0,
      boxShadow: `0 2px 8px ${bg}80`,
    }}>
      {initial}
    </div>
  );
}

// ─────────────────────────────────────────────
// GHOST BUTTON
// ─────────────────────────────────────────────
function BtnGhost({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '8px 14px', border: 'none', cursor: 'pointer',
        background: 'transparent', color: '#6B7280',
        borderRadius: 8, fontSize: '0.85rem', fontWeight: 500,
        transition: 'all 0.15s', fontFamily: 'inherit',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.background = '#F3F4F6';
        (e.currentTarget as HTMLElement).style.color = '#111827';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.background = 'transparent';
        (e.currentTarget as HTMLElement).style.color = '#6B7280';
      }}
    >
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────
// INTERVIEW CARD
// ─────────────────────────────────────────────
function InterviewCard({ iv }: { iv: InterviewListItem }) {
  const [hovered, setHovered] = useState(false);
  const formatDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const formatTime = (iso: string) => new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const typeColors: Record<string, { bg: string; color: string; border: string }> = {
    ONLINE:  { bg: '#EFF6FF', color: '#1E40AF', border: '#BFDBFE' },
    OFFLINE: { bg: '#FAF5FF', color: '#5B21B6', border: '#DDD6FE' },
    HYBRID:  { bg: '#FEF3C7', color: '#92400E', border: '#FDE68A' },
  };
  const tc = typeColors[iv.meetingType] ?? typeColors.ONLINE;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 16,
        padding: '16px 20px',
        background: hovered ? '#FFFFFF' : '#FAFBFC',
        border: `1px solid ${hovered ? '#E5E7EB' : '#F1F5F9'}`,
        borderRadius: 14,
        boxShadow: hovered ? '0 4px 16px rgba(0,0,0,0.07)' : 'none',
        transition: 'all 0.2s ease',
        cursor: 'default',
      }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: `linear-gradient(135deg, ${tc.bg}, ${tc.border}40)`,
        color: tc.color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1rem', flexShrink: 0,
        boxShadow: `0 2px 8px ${tc.border}60`,
      }}>
        <i className="fas fa-video" />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontWeight: 600, fontSize: '0.9rem', color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {iv.jobTitle}
        </p>
        <p style={{ fontSize: '0.8rem', color: '#6B7280', margin: '2px 0 0' }}>
          {iv.companyName}
        </p>
      </div>

      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', margin: 0 }}>
          {formatTime(iv.scheduledTime)}
        </p>
        <p style={{ fontSize: '0.75rem', color: '#9CA3AF', margin: '2px 0 0' }}>
          {formatDate(iv.scheduledTime)}
        </p>
      </div>

      <span style={{
        padding: '3px 8px', borderRadius: 6,
        fontSize: '0.72rem', fontWeight: 600,
        background: tc.bg, color: tc.color,
        border: `1px solid ${tc.border}`,
      }}>
        {iv.meetingType}
      </span>

      {iv.meetingType === 'ONLINE' && (
        <button
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px',
            background: 'linear-gradient(135deg, #2563EB, #4F46E5)',
            color: '#FFFFFF', border: 'none', borderRadius: 10,
            cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
            fontFamily: 'inherit', flexShrink: 0,
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'linear-gradient(135deg, #1D4ED8, #4338CA)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'linear-gradient(135deg, #2563EB, #4F46E5)'}
        >
          <i className="fas fa-video" /> Join
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN DASHBOARD
// ─────────────────────────────────────────────
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
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const statCards = [
    {
      label: 'Jobs Applied',
      value: stats?.jobsApplied ?? 0,
      icon: 'fa-paper-plane',
      color: 'blue' as const,
      change: "",
      gradient: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)',
      iconBg: '#DBEAFE',
      iconColor: '#2563EB',
    },
    {
      label: 'Interviews',
      value: stats?.interviewsCount ?? 0,
      icon: 'fa-calendar-check',
      color: 'purple' as const,
      change: "",
      gradient: 'linear-gradient(135deg, #FAF5FF, #EDE9FE)',
      iconBg: '#EDE9FE',
      iconColor: '#9333EA',
    },
    {
      label: 'Offers',
      value: 0,
      icon: 'fa-hand-holding-heart',
      color: 'green' as const,
      change: "",
      gradient: 'linear-gradient(135deg, #F0FDF4, #D1FAE5)',
      iconBg: '#D1FAE5',
      iconColor: '#16A34A',
    },
  ];

  const quickActions = [
    { label: 'Browse Jobs', icon: 'fa-search', path: '/jobs', primary: true, desc: 'Find your dream role' },
    { label: 'My Applications', icon: 'fa-file-alt', path: '/applications', primary: false, desc: 'Track your progress' },
    { label: 'Upload Resume', icon: 'fa-upload', path: '/resumes', primary: false, desc: 'Update your profile' },
    { label: 'Interviews', icon: 'fa-calendar', path: '/interviews', primary: false, desc: 'View schedule' },
  ];

  const emptyTable = (cols: number, icon: string, msg: string, sub: string) => (
    <tr>
      <td colSpan={cols} style={{ padding: '56px 24px', textAlign: 'center' }}>
        <div style={{
          width: 56, height: 56, borderRadius: 14,
          background: 'linear-gradient(135deg, #F1F5F9, #E2E8F0)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 14px',
        }}>
          <i className={`fas ${icon}`} style={{ fontSize: '1.3rem', color: '#94A3B8' }} />
        </div>
        <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#374151', marginBottom: 4 }}>{msg}</div>
        <div style={{ fontSize: '0.82rem', color: '#9CA3AF' }}>{sub}</div>
      </td>
    </tr>
  );

  return (
    <div>
      {/* ── Welcome Hero ── */}
      <div style={{
        background: 'linear-gradient(135deg, #1E3A5F 0%, #2563EB 50%, #4F46E5 100%)',
        borderRadius: 20,
        padding: '36px 40px',
        marginBottom: 28,
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(37, 99, 235, 0.3)',
        animation: 'fadeSlideUp 0.45s ease both',
      }}>
        {/* Decorative floating circles */}
        <div style={{
          position: 'absolute', top: -40, right: -20,
          width: 180, height: 180, borderRadius: '50%',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.06)',
        }} />
        <div style={{
          position: 'absolute', bottom: -30, right: 120,
          width: 100, height: 100, borderRadius: '50%',
          background: 'rgba(255,255,255,0.03)',
        }} />
        <div style={{
          position: 'absolute', top: 20, right: 200,
          width: 12, height: 12, borderRadius: '50%',
          background: 'rgba(255,255,255,0.15)',
          animation: 'statusPulse 3s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', bottom: 30, right: 80,
          width: 8, height: 8, borderRadius: '50%',
          background: 'rgba(16, 185, 129, 0.4)',
          animation: 'statusPulse 2s ease-in-out infinite',
        }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
          <div>
            <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.55)', margin: '0 0 8px' }}>
              <i className="fas fa-sparkles" style={{ marginRight: 6 }} />
              Job Seeker Dashboard
            </p>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#FFFFFF', margin: '0 0 8px', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              Welcome back! Ready to land your next role?
            </h1>
            {/* <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.65)', margin: 0, fontWeight: 400 }}>
              You have {stats?.jobsApplied ?? 0} application{(stats?.jobsApplied ?? 0) !== 1 ? 's' : ''} in progress
              {stats?.upcomingInterviews ? ` and ${stats.upcomingInterviews} upcoming interview${stats.upcomingInterviews !== 1 ? 's' : ''}` : ''}.
            </p> */}

            {/* Quick Stats Pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 18 }}>
              {[
                { icon: 'fa-paper-plane', val: stats?.jobsApplied ?? 0, label: 'Applied' },
                { icon: 'fa-comments', val: stats?.interviewsCount ?? 0, label: 'Interviews' },
                { icon: 'fa-hand-holding-heart', val: 0, label: 'Offers' },
              ].map(s => (
                <div key={s.label} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 16px',
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 50,
                  backdropFilter: 'blur(8px)',
                }}>
                  <i className={`fas ${s.icon}`} style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)' }} />
                  <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#FFFFFF' }}>{s.val}</span>
                  <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Decorative illustration area */}
          <div style={{
            width: 120, height: 120,
            background: 'rgba(255,255,255,0.06)',
            borderRadius: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid rgba(255,255,255,0.08)',
            flexShrink: 0,
          }}>
            <div style={{ textAlign: 'center' }}>
              <i className="fas fa-rocket" style={{ fontSize: '2.5rem', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 8 }} />
              <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>Keep Going!</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats Grid ── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 20,
        }}>
          {statCards.map((stat, i) => (
            <div
              key={stat.label}
              className="animate-fadeSlideUp"
              style={{
                background: '#FFFFFF',
                border: '1px solid #E5E7EB',
                borderRadius: 18,
                padding: '24px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 16,
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
                cursor: 'default',
                animationDelay: `${i * 0.08}s`,
                position: 'relative',
                overflow: 'hidden',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.transform = 'translateY(-4px)';
                el.style.boxShadow = '0 12px 40px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.transform = 'translateY(0)';
                el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)';
              }}
            >
              {/* Gradient accent top stripe */}
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                background: stat.gradient,
              }} />

              <div style={{
                width: 52, height: 52, borderRadius: 14,
                background: stat.iconBg,
                color: stat.iconColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.2rem', flexShrink: 0,
                boxShadow: `0 4px 12px ${stat.iconBg}`,
              }}>
                <i className={`fas ${stat.icon}`} />
              </div>

              <div>
                <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#9CA3AF', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {stat.label}
                </p>
                <div style={{
                  fontSize: '2rem', fontWeight: 800,
                  letterSpacing: '-0.04em', lineHeight: 1.1,
                  color: '#0F172A',
                  background: `linear-gradient(135deg, #0F172A, ${stat.iconColor})`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>
                  {stat.value}
                </div>
                <p style={{ fontSize: '0.78rem', color: '#6B7280', margin: '4px 0 0', fontWeight: 500 }}>
                  {stat.change}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Quick Actions ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 12,
        marginBottom: 28,
        animation: 'fadeSlideUp 0.45s ease 0.3s both',
      }}>
        {quickActions.map((action, _i) => (
          <button
            key={action.label}
            onClick={() => navigate(action.path)}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 18px',
              borderRadius: 14,
              cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600,
              fontFamily: 'inherit',
              border: action.primary ? 'none' : '1.5px solid #E5E7EB',
              background: action.primary
                ? 'linear-gradient(135deg, #2563EB, #4F46E5)'
                : '#FFFFFF',
              color: action.primary ? '#FFFFFF' : '#374151',
              boxShadow: action.primary
                ? '0 4px 16px rgba(37, 99, 235, 0.3)'
                : '0 1px 4px rgba(0,0,0,0.04)',
              transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
              textAlign: 'left',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement;
              if (action.primary) {
                el.style.transform = 'translateY(-3px) scale(1.01)';
                el.style.boxShadow = '0 8px 24px rgba(37, 99, 235, 0.4)';
              } else {
                el.style.transform = 'translateY(-2px)';
                el.style.borderColor = '#2563EB';
                el.style.color = '#2563EB';
                el.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.1)';
              }
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.transform = 'none';
              if (action.primary) {
                el.style.boxShadow = '0 4px 16px rgba(37, 99, 235, 0.3)';
              } else {
                el.style.borderColor = '#E5E7EB';
                el.style.color = '#374151';
                el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)';
              }
            }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: action.primary
                ? 'rgba(255,255,255,0.2)'
                : '#EFF6FF',
              color: action.primary ? '#FFFFFF' : '#2563EB',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.85rem', flexShrink: 0,
            }}>
              <i className={`fas ${action.icon}`} />
            </div>
            <div>
              <div>{action.label}</div>
              <div style={{
                fontSize: '0.72rem', fontWeight: 400,
                color: action.primary ? 'rgba(255,255,255,0.65)' : '#9CA3AF',
                marginTop: 2,
              }}>
                {action.desc}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* ── Two-Column Layout ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 400px',
        gap: 24,
        animation: 'fadeSlideUp 0.45s ease 0.4s both',
      }}>

        {/* Left: Recent Applications */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: 18,
          border: '1px solid #E5E7EB',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          overflow: 'hidden',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '20px 24px',
            borderBottom: '1px solid #F1F5F9',
          }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: '#2563EB', boxShadow: '0 0 0 3px rgba(37,99,235,0.15)',
                }} />
                Recent Applications
              </h3>

            </div>
            <BtnGhost onClick={() => navigate('/applications')}>
              View All <i className="fas fa-arrow-right" style={{ fontSize: '0.7rem' }} />
            </BtnGhost>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  {['Position', 'Company', 'Status', 'Applied', ''].map(h => (
                    <th key={h} style={{
                      padding: '12px 20px',
                      textAlign: 'left',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      color: '#9CA3AF',
                      borderBottom: '1px solid #F1F5F9',
                      background: '#FAFBFC',
                      whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentApps.length === 0
                  ? emptyTable(5, 'fa-file-alt', 'No applications yet', 'Start applying to jobs to see your progress here.')
                  : recentApps.map(app => (
                    <tr
                      key={app.id}
                      style={{ cursor: 'pointer', transition: 'background 0.15s' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F9FAFB'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                      onClick={() => navigate(`/applications/${app.id}`)}
                    >
                      <td style={{ padding: '14px 20px', borderBottom: '1px solid #F9FAFB', verticalAlign: 'middle' }}>
                        <span style={{ fontWeight: 600, color: '#111827', fontSize: '0.875rem' }}>
                          {app.jobTitle}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px', borderBottom: '1px solid #F9FAFB', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <CompanyAvatar initial={app.companyInitial ?? app.companyName?.charAt(0) ?? '?'} />
                          <span style={{ color: '#6B7280', fontSize: '0.875rem' }}>{app.companyName}</span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 20px', borderBottom: '1px solid #F9FAFB', verticalAlign: 'middle' }}>
                        <StatusBadge value={app.status} />
                      </td>
                      <td style={{ padding: '14px 20px', borderBottom: '1px solid #F9FAFB', color: '#9CA3AF', fontSize: '0.82rem', verticalAlign: 'middle' }}>
                        {formatDate(app.appliedAt)}
                      </td>
                      <td style={{ padding: '14px 20px', borderBottom: '1px solid #F9FAFB', verticalAlign: 'middle' }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/applications/${app.id}`); }}
                          style={{
                            width: 32, height: 32, border: 'none',
                            background: '#F1F5F9', cursor: 'pointer',
                            color: '#94A3B8', borderRadius: 8,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.15s',
                          }}
                          onMouseEnter={e => {
                            (e.currentTarget as HTMLElement).style.background = '#DBEAFE';
                            (e.currentTarget as HTMLElement).style.color = '#2563EB';
                          }}
                          onMouseLeave={e => {
                            (e.currentTarget as HTMLElement).style.background = '#F1F5F9';
                            (e.currentTarget as HTMLElement).style.color = '#94A3B8';
                          }}
                        >
                          <i className="fas fa-arrow-right" style={{ fontSize: '0.75rem' }} />
                        </button>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Upcoming Interviews */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: 18,
          border: '1px solid #E5E7EB',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          overflow: 'hidden',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '20px 24px',
            borderBottom: '1px solid #F1F5F9',
          }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: '#9333EA', boxShadow: '0 0 0 3px rgba(147,51,234,0.15)',
                }} />
                Upcoming Interviews
              </h3>
            </div>
            <BtnGhost onClick={() => navigate('/interviews')}>
              View All <i className="fas fa-arrow-right" style={{ fontSize: '0.7rem' }} />
            </BtnGhost>
          </div>

          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {upcomingInterviews.length === 0 ? (
              <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 14,
                  background: 'linear-gradient(135deg, #F1F5F9, #E2E8F0)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 14px',
                }}>
                  <i className="fas fa-calendar" style={{ fontSize: '1.3rem', color: '#94A3B8' }} />
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                  No upcoming interviews
                </div>
                <div style={{ fontSize: '0.82rem', color: '#9CA3AF' }}>
                  Complete more applications to get interview invites!
                </div>
              </div>
            ) : (
              upcomingInterviews.map(iv => <InterviewCard key={iv.id} iv={iv} />)
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes statusPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.3); }
        }
      `}</style>
    </div>
  );
}
