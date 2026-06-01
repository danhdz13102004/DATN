import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
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
      return { icon: 'fa-paper-plane', bg: '#EFF6FF', color: '#2563EB' };
    case 'INTERVIEW_INVITE':
      return { icon: 'fa-calendar-check', bg: '#FFFBEB', color: '#D97706' };
    case 'MESSAGE':
      return { icon: 'fa-comments', bg: '#F0F9FF', color: '#0284C7' };
    case 'APPLICATION_UPDATE':
      return { icon: 'fa-file-alt', bg: '#F5F3FF', color: '#7C3AED' };
    default:
      return { icon: 'fa-bell', bg: '#F9FAFB', color: '#6B7280' };
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

    const notif = e.notification;
    setItems((prev) => {
      const existing = prev.findIndex((n) => n.id === notif.id);
      if (existing >= 0) {
        return prev.map((n, idx) => (idx === existing ? notif : n));
      }
      return [notif, ...prev];
    });
  }, []);

  useRecruitProWebSocket({ onNotification });

  const unreadCount = useMemo(() => items.filter((n) => !n.isRead).length, [items]);

  const filtered = useMemo(() => {
    if (activeTab === 'ALL') return items;
    if (activeTab === 'UNREAD') return items.filter((n) => !n.isRead);
    return items.filter((n) => n.type === activeTab);
  }, [items, activeTab]);

  const markRead = async (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    try {
      await notificationService.markRead(id);
    } catch {
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: false } : n)));
    }
  };

  const markAllRead = async () => {
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await notificationService.markAllRead();
    } catch {
      // Keep optimistic state
    }
  };

  const openNotification = (n: Notification) => {
    if (!n.isRead) {
      void markRead(n.id);
    }
    const target = toTargetPath(n);
    if (target) navigate(target);
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <PageHeader
        title="Notifications"
        subtitle="Stay updated on your applications and interviews."
        action={
          unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
            >
              <i className="fas fa-check-double text-xs" />
              Mark All Read
            </button>
          )
        }
      />

      {/* Tab Bar */}
      <div className="bg-white rounded-2xl border border-gray-100 p-1.5 shadow-sm flex flex-wrap gap-1">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const count = tab.key === 'UNREAD' ? unreadCount : 0;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
              }`}
            >
              {tab.label}
              {count > 0 && (
                <span
                  className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-red-100 text-red-600'
                  }`}
                >
                  {count > 99 ? '99+' : count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Notification List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
        {loading ? (
          <div className="py-16 flex items-center justify-center">
            <div className="w-8 h-8 border-[3px] border-blue-100 border-t-primary rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="fa-bell-slash"
            title="No notifications"
            description={
              activeTab === 'UNREAD'
                ? "You're all caught up! Check back later for updates."
                : "When you get updates on your applications or interviews, they'll appear here."
            }
          />
        ) : (
          filtered.map((n) => {
            const icon = itemIcon(n.type);
            return (
              <article
                key={n.id}
                className={`group flex items-start gap-4 px-5 py-4 cursor-pointer transition-colors duration-150 ${
                  !n.isRead ? 'bg-blue-50/40' : 'bg-white hover:bg-gray-50/60'
                }`}
                onClick={() => openNotification(n)}
              >
                {/* Icon */}
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: icon.bg, color: icon.color }}
                >
                  <i className={`fas ${icon.icon}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 leading-relaxed">
                    <span className="font-semibold text-gray-900">{n.title}</span>
                    {n.content ? ` — ${n.content}` : ''}
                  </p>
                  <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1.5">
                    <i className="fas fa-clock text-[10px]" />
                    {timeAgo(n.createdAt)}
                  </p>
                </div>

                {/* Unread dot */}
                {!n.isRead && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      void markRead(n.id);
                    }}
                    className="w-6 h-6 rounded-full bg-blue-100 text-primary flex items-center justify-center flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-200"
                    title="Mark as read"
                  >
                    <i className="fas fa-check text-[10px]" />
                  </button>
                )}
                {n.isRead && (
                  <div className="w-6 h-6 flex-shrink-0 mt-1" />
                )}
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
