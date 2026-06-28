import { useEffect, useRef, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { notificationService } from '../../services/chatService';
import { useRecruitProWebSocket } from '../../hooks/useWebSocket';
import type { NotificationEvent } from '../../types/chat';
import { useToast } from '../../contexts/ToastContext';

interface TopbarProps {
  title: string;
  breadcrumbs?: { label: string; to?: string }[];
  onMenuToggle: () => void;
}

export default function Topbar({ title, breadcrumbs, onMenuToggle }: TopbarProps) {
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const latestToastNotifIdRef = useRef<string | null>(null);

  useEffect(() => {
    notificationService.unreadCount().then(setUnreadCount).catch(() => {});
  }, []);

  useRecruitProWebSocket({
    onNotification: (e: NotificationEvent) => {
      setUnreadCount(e.unreadCount);
      if (!e.notification) return;
      if (latestToastNotifIdRef.current === e.notification.id) return;
      latestToastNotifIdRef.current = e.notification.id;

      if (e.notification.type === 'MESSAGE' && location.pathname.startsWith('/messages')) {
        return;
      }

      if (e.notification.type === 'MESSAGE') {
        const senderName = e.notification.title?.replace(/^New message from\s+/i, '').trim() || 'Someone';
        const content = e.notification.content || 'Sent you a message';
        toast.show({
          title: 'New msg',
          message: `${senderName}\n${content}`,
          type: 'info',
          duration: 4500,
        });
        return;
      }

      const text = e.notification.title || e.notification.content || 'You have a new notification';
      toast.info(text, 3500);
    },
  });

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-gray-100/80 px-6 py-3.5 flex items-center justify-between transition-all duration-200" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
      <div className="flex items-center gap-3">
        <button
          className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-all"
          onClick={onMenuToggle}
          title="Toggle sidebar"
        >
          <i className="fas fa-bars" />
        </button>

        {/* Title and breadcrumbs */}
        <div>
          {breadcrumbs && breadcrumbs.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-0.5">
              {breadcrumbs.map((bc, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  {i > 0 && <i className="fas fa-chevron-right text-[0.55rem] text-gray-300" />}
                  {bc.to ? (
                    <Link to={bc.to} className="text-primary hover:text-primary-hover font-medium transition-colors">
                      {bc.label}
                    </Link>
                  ) : (
                    <span className={i === breadcrumbs.length - 1 ? 'text-gray-600 font-semibold' : 'text-gray-400'}>
                      {bc.label}
                    </span>
                  )}
                </span>
              ))}
            </div>
          )}
          <h1 className="text-lg font-bold text-gray-900 tracking-tight">{title}</h1>
        </div>
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-2">
        {/* Notification bell */}
        <button
          id="notification-bell"
          onClick={() => navigate('/notifications')}
          className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all relative ${
            unreadCount > 0
              ? 'text-amber-500 hover:bg-amber-50'
              : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
          }`}
          title="Notifications"
        >
          {unreadCount > 0 && (
            <div
              className="absolute inset-0 rounded-xl animate-ping opacity-20 bg-amber-400"
              style={{ animationDuration: '2s' }}
            />
          )}
          <i className="fas fa-bell relative z-10" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 z-20 shadow-sm">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
