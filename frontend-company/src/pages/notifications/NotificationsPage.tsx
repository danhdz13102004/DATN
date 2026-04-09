import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import Topbar from '../../components/layout/Topbar';
import { ROUTES } from '../../constants';
import { useRecruitProWebSocket } from '../../hooks/useWebSocket';
import { notificationService } from '../../services/chatService';
import type { Notification, NotificationEvent } from '../../types/chat';

const TABS = [
  { key: 'ALL', label: 'All' },
  { key: 'UNREAD', label: 'Unread' },
  { key: 'JOB_APPLIED', label: 'Applications' },
  { key: 'INTERVIEW_INVITE', label: 'Interviews' },
  { key: 'MESSAGE', label: 'Messages' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

function timeAgo(iso: string) {
  const now = Date.now();
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return '';

  const diff = Math.max(0, Math.floor((now - ts) / 1000));
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  if (diff < 172800) return 'Yesterday';
  return new Date(ts).toLocaleDateString();
}

function itemIcon(type: Notification['type']) {
  switch (type) {
    case 'JOB_APPLIED':
      return { icon: 'fa-file-alt', cls: 'bg-primary/10 text-primary' };
    case 'INTERVIEW_INVITE':
      return { icon: 'fa-calendar-check', cls: 'bg-amber-100 text-amber-600' };
    case 'MESSAGE':
      return { icon: 'fa-comment', cls: 'bg-sky-100 text-sky-600' };
    case 'APPLICATION_UPDATE':
      return { icon: 'fa-arrow-right-arrow-left', cls: 'bg-rose-100 text-rose-600' };
    default:
      return { icon: 'fa-bell', cls: 'bg-gray-100 text-gray-500' };
  }
}

function toTargetPath(n: Notification) {
  if (n.type === 'MESSAGE') {
    return n.referenceId ? `/messages/${n.referenceId}` : ROUTES.MESSAGES;
  }
  if (n.type === 'INTERVIEW_INVITE') {
    return ROUTES.INTERVIEWS;
  }
  if (n.type === 'JOB_APPLIED' || n.type === 'APPLICATION_UPDATE') {
    if (n.referenceType?.toUpperCase().includes('APPLICATION') && n.referenceId) {
      return `/applications/${n.referenceId}`;
    }
    return ROUTES.APPLICATIONS;
  }
  return null;
}

export default function NotificationsPage() {
  const { onMenuToggle } = useOutletContext<{ onMenuToggle: () => void }>();
  const navigate = useNavigate();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('ALL');

  useEffect(() => {
    notificationService
      .list(0, 100)
      .then((res) => setItems(res.content))
      .finally(() => setLoading(false));
  }, []);

  const onNotification = useCallback((e: NotificationEvent) => {
    if (!e.notification) {
      notificationService.list(0, 100).then((res) => setItems(res.content)).catch(() => {});
      return;
    }

    setItems((prev) => {
      const existing = prev.findIndex((n) => n.id === e.notification.id);
      if (existing >= 0) {
        return prev.map((n, idx) => (idx === existing ? e.notification : n));
      }
      return [e.notification, ...prev];
    });
  }, []);

  useRecruitProWebSocket({ onNotification });

  const unreadCount = useMemo(() => items.filter((n) => !n.isRead).length, [items]);

  const filtered = useMemo(() => {
    if (activeTab === 'ALL') return items;
    if (activeTab === 'UNREAD') return items.filter((n) => !n.isRead);
    return items.filter((n) => n.type === activeTab);
  }, [items, activeTab]);

  const handleMarkRead = async (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    try {
      await notificationService.markRead(id);
    } catch {
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: false } : n)));
    }
  };

  const handleMarkAllRead = async () => {
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await notificationService.markAllRead();
    } catch {
      // Keep optimistic state for smoother UX if endpoint is eventually consistent.
    }
  };

  const handleOpen = (n: Notification) => {
    if (!n.isRead) {
      void handleMarkRead(n.id);
    }
    const target = toTargetPath(n);
    if (target) navigate(target);
  };

  return (
    <>
      <Topbar title="Notifications" onMenuToggle={onMenuToggle} />

      <div className="p-6 space-y-5">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-50 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Notifications</h2>
            <p className="text-sm text-gray-500 mt-1">Stay updated with your recruitment activities.</p>
          </div>
          <button
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <i className="fas fa-check-double mr-2" />
            Mark All Read
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-50 p-2 flex flex-wrap gap-2">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab.label}
                {tab.key === 'UNREAD' && unreadCount > 0 && (
                  <span className={`ml-2 inline-flex min-w-5 h-5 px-1.5 items-center justify-center rounded-full text-[11px] ${isActive ? 'bg-white/25 text-white' : 'bg-red-500 text-white'}`}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-50 overflow-hidden divide-y divide-gray-100">
          {loading ? (
            <div className="py-12 flex justify-center">
              <div className="w-7 h-7 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <i className="fas fa-bell-slash text-3xl text-gray-200 mb-3 block" />
              <p className="text-sm font-medium">No notifications</p>
            </div>
          ) : (
            filtered.map((n) => {
              const icon = itemIcon(n.type);
              return (
                <article
                  key={n.id}
                  className={`px-5 py-4 flex gap-3 items-start cursor-pointer hover:bg-gray-50/60 transition-colors ${!n.isRead ? 'bg-primary/5' : ''}`}
                  onClick={() => handleOpen(n)}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${icon.cls}`}>
                    <i className={`fas ${icon.icon}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 leading-relaxed">
                      <strong className="text-gray-900">{n.title}</strong>
                      {n.content ? ` - ${n.content}` : ''}
                    </p>
                    <p className="text-xs text-gray-400 mt-1.5">
                      <i className="fas fa-clock mr-1" />
                      {timeAgo(n.createdAt)}
                    </p>
                  </div>

                  {!n.isRead && (
                    <button
                      className="w-7 h-7 rounded-full hover:bg-gray-100 text-primary transition-colors"
                      title="Mark as read"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleMarkRead(n.id);
                      }}
                    >
                      <i className="fas fa-circle text-[10px]" />
                    </button>
                  )}
                </article>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
