import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { ROUTES } from '../../constants';
import { notificationService } from '../../services/chatService';
import { useRecruitProWebSocket } from '../../hooks/useWebSocket';
import type { NotificationEvent } from '../../types/chat';
import { useToast } from '../../contexts/ToastContext';

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

const BTN_STYLE: React.CSSProperties = {
  width: '40px', height: '40px', border: 'none',
  background: 'transparent', borderRadius: '6px',
  cursor: 'pointer', color: '#5f6780', fontSize: '1.1rem',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'all 0.2s ease', position: 'relative',
};

export default function Topbar({ onMenuClick }: TopbarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [hoveredBtn, setHoveredBtn] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const toast = useToast();
  const latestToastNotifIdRef = useRef<string | null>(null);

  useEffect(() => {
    notificationService.unreadCount().then(setUnreadCount).catch(() => {});
  }, []);

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
    ...BTN_STYLE,
    background: hoveredBtn === id ? '#f4f6fa' : 'transparent',
    color: hoveredBtn === id ? '#1a1d26' : '#5f6780',
  });

  return (
    <header style={{
      height: '64px',
      background: '#ffffff',
      borderBottom: '1px solid #e2e6ed',
      display: 'flex', alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 32px',
      position: 'sticky', top: 0, zIndex: 50,
    }}>
      {/* Left */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button
          onClick={onMenuClick}
          style={{ ...BTN_STYLE, display: 'flex' }}
          className="lg:hidden"
          onMouseEnter={() => setHoveredBtn('menu')}
          onMouseLeave={() => setHoveredBtn(null)}
        >
          <i className="fas fa-bars" />
        </button>

        {isJobDetail ? (
          /* Breadcrumb for job detail */
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#8b92a8', fontSize: '0.85rem' }}>
            <button
              onClick={() => navigate('/jobs')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8b92a8', fontSize: '0.85rem', fontFamily: 'inherit', padding: 0 }}
              onMouseEnter={e => (e.currentTarget.style.color = '#4287f5')}
              onMouseLeave={e => (e.currentTarget.style.color = '#8b92a8')}
            >
              Browse Jobs
            </button>
            <i className="fas fa-chevron-right" style={{ fontSize: '0.6rem', opacity: 0.6 }} />
            <span style={{ color: '#1a1d26', fontWeight: 500 }}>Job Details</span>
          </div>
        ) : (
          <h1 style={{
            fontSize: '1.25rem', fontWeight: 600,
            letterSpacing: '-0.02em', color: '#1a1d26',
            margin: 0,
          }}>
            {getTitle()}
          </h1>
        )}
      </div>

      {/* Right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {isJobDetail ? (
          /* Job detail: show bookmark + share instead of search */
          <>
            <button
              style={btnStyle('bookmark')}
              title="Save job"
              onMouseEnter={() => setHoveredBtn('bookmark')}
              onMouseLeave={() => setHoveredBtn(null)}
            >
              <i className="fas fa-bookmark" />
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
                top: '6px',
                right: '4px',
                minWidth: '16px',
                height: '16px',
                borderRadius: '999px',
                background: '#ef4444',
                border: '2px solid #fff',
                color: '#fff',
                fontSize: '9px',
                fontWeight: 700,
                lineHeight: '1',
                padding: '0 4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
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
