import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { ROUTES } from '../../constants';
import { notificationService } from '../../services/chatService';
import { useRecruitProWebSocket } from '../../hooks/useWebSocket';
import type { NotificationEvent } from '../../types/chat';
import { useToast } from '../../contexts/ToastContext';
import { useAuthStore } from '../../store/authStore';

const PAGE_TITLES: Record<string, string> = {
  [ROUTES.DASHBOARD]: 'Dashboard',
  '/': 'Dashboard',
  [ROUTES.JOBS]: 'Browse Jobs',
  [ROUTES.APPLICATIONS]: 'My Applications',
  [ROUTES.INTERVIEWS]: 'Interviews',
  [ROUTES.RESUMES]: 'My Resumes',
  [ROUTES.PROFILE]: 'Profile',
  [ROUTES.MESSAGES]: 'Messages',
  [ROUTES.NOTIFICATIONS]: 'Notifications',
};

interface TopbarProps {
  onMenuClick: () => void;
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [hoveredBtn, setHoveredBtn] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const toast = useToast();
  const latestToastNotifIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      notificationService.unreadCount().then(setUnreadCount).catch(() => {});
    }
  }, [isAuthenticated]);

  useRecruitProWebSocket({
    onNotification: (e: NotificationEvent) => {
      console.log('Received notification event:', e);
      setUnreadCount(e.unreadCount);
      if (!e.notification) return;
      if (latestToastNotifIdRef.current === e.notification.id) return;
      latestToastNotifIdRef.current = e.notification.id;

      const text = e.notification.title || e.notification.content || 'You have a new notification';
      toast.info(text, 3500);
    },
  });

  const isJobDetail = location.pathname.startsWith('/jobs/') && location.pathname !== '/jobs';
  const isAppDetail = location.pathname.startsWith('/applications/') && location.pathname !== '/applications';

  const getTitle = () => {
    if (PAGE_TITLES[location.pathname]) return PAGE_TITLES[location.pathname];
    if (isJobDetail) return 'Job Details';
    if (isAppDetail) return 'Application Details';
    return 'Dashboard';
  };

  const btnStyle = (id: string): React.CSSProperties => ({
    width: '40px', height: '40px', border: 'none',
    background: hoveredBtn === id ? '#F3F4F6' : 'transparent', borderRadius: '10px',
    cursor: 'pointer', color: hoveredBtn === id ? '#111827' : '#6B7280', fontSize: '1rem',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    position: 'relative',
    transition: 'all 0.15s ease',
  });

  return (
    <header style={{
      height: '72px',
      background: '#FFFFFF',
      borderBottom: '1px solid #E5E7EB',
      display: 'flex', alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 32px',
      position: 'sticky', top: 0, zIndex: 50,
    }}>
      {/* Left */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button
          onClick={onMenuClick}
          style={{ ...btnStyle('menu'), display: 'flex' }}
          className="lg:hidden"
          onMouseEnter={() => setHoveredBtn('menu')}
          onMouseLeave={() => setHoveredBtn(null)}
        >
          <i className="fas fa-bars" />
        </button>

        {isJobDetail ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#9CA3AF', fontSize: '0.875rem' }}>
            <button
              onClick={() => navigate('/jobs')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', fontSize: '0.875rem', fontFamily: 'inherit', padding: 0 }}
              onMouseEnter={e => (e.currentTarget.style.color = '#2563EB')}
              onMouseLeave={e => (e.currentTarget.style.color = '#6B7280')}
            >
              Browse Jobs
            </button>
            <i className="fas fa-chevron-right" style={{ fontSize: '0.6rem', opacity: 0.5 }} />
            <span style={{ color: '#111827', fontWeight: 600 }}>Job Details</span>
          </div>
        ) : (
          <h1 style={{
            fontSize: '1.35rem', fontWeight: 700,
            letterSpacing: '-0.02em', color: '#111827',
            margin: 0,
          }}>
            {getTitle()}
          </h1>
        )}
      </div>

      {/* Right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Guest auth buttons on job pages */}
        {!isAuthenticated && (location.pathname === ROUTES.JOBS || location.pathname.startsWith('/jobs/')) && (
          <>
            <button
              onClick={() => navigate(ROUTES.LOGIN, { state: { from: location.pathname } })}
              style={{
                padding: '9px 18px',
                borderRadius: '10px',
                border: '1.5px solid #E5E7EB',
                background: 'white',
                color: '#374151',
                fontSize: '0.875rem',
                fontFamily: 'inherit',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#2563EB'; (e.currentTarget as HTMLButtonElement).style.color = '#2563EB'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#E5E7EB'; (e.currentTarget as HTMLButtonElement).style.color = '#374151'; }}
            >
              Login
            </button>
            <button
              onClick={() => navigate(ROUTES.SIGNUP, { state: { from: location.pathname } })}
              style={{
                padding: '9px 18px',
                borderRadius: '10px',
                border: 'none',
                background: '#2563EB',
                color: 'white',
                fontSize: '0.875rem',
                fontFamily: 'inherit',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = '#1D4ED8'}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = '#2563EB'}
            >
              Register
            </button>
          </>
        )}

        {isJobDetail ? (
          <>
            <button
              style={btnStyle('bookmark')}
              title="Save job"
              onMouseEnter={() => setHoveredBtn('bookmark')}
              onMouseLeave={() => setHoveredBtn(null)}
            >
              <i className="far fa-bookmark" />
            </button>
            <button
              style={btnStyle('share')}
              title="Share job"
              onMouseEnter={() => setHoveredBtn('share')}
              onMouseLeave={() => setHoveredBtn(null)}
            >
              <i className="fas fa-share-alt" />
            </button>
          </>
        ) : (
          <></>
        )}

        {/* Bell - only on non-detail pages */}
        {!isJobDetail && (
          <button
            style={btnStyle('bell')}
            onClick={() => navigate(ROUTES.NOTIFICATIONS)}
            title="Notifications"
            onMouseEnter={() => setHoveredBtn('bell')}
            onMouseLeave={() => setHoveredBtn(null)}
          >
            <i className="fas fa-bell" />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '5px',
                right: '5px',
                minWidth: '16px',
                height: '16px',
                borderRadius: '999px',
                background: '#EF4444',
                border: '2px solid #fff',
                color: '#fff',
                fontSize: '9px',
                fontWeight: 700,
                lineHeight: '1',
                padding: '0 4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxSizing: 'border-box',
                pointerEvents: 'none',
              }}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
        )}
      </div>
    </header>
  );
}
