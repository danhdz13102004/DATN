import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

      const text = e.notification.title || e.notification.content || 'You have a new notification';
      toast.info(text, 3500);
    },
  });

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          onClick={onMenuToggle}
        >
          <i className="fas fa-bars" />
        </button>
        <div>
          {breadcrumbs && breadcrumbs.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-0.5">
              {breadcrumbs.map((bc, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  {bc.to ? (
                    <a href={bc.to} className="text-primary hover:underline">{bc.label}</a>
                  ) : (
                    <span className="text-gray-500">{bc.label}</span>
                  )}
                  {i < breadcrumbs.length - 1 && <i className="fas fa-chevron-right text-[0.6rem]" />}
                </span>
              ))}
            </div>
          )}
          <h1 className="text-lg font-bold text-gray-900">{title}</h1>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          id="notification-bell"
          onClick={() => navigate('/notifications')}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors relative"
          title="Notifications"
        >
          <i className="fas fa-bell" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
