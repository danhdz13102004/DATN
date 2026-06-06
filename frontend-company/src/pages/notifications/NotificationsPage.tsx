import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import Topbar from '../../components/layout/Topbar';
import { ROUTES } from '../../constants';
import { useRecruitProWebSocket } from '../../hooks/useWebSocket';
import { notificationService } from '../../services/chatService';
import type { Notification, NotificationEvent } from '../../types/chat';
import EmptyState from '../../components/common/EmptyState';

const TABS = [
  { key: 'ALL',                label: 'All'          },
  { key: 'UNREAD',             label: 'Unread'       },
  { key: 'JOB_APPLIED',        label: 'Applications' },
  { key: 'INTERVIEW_INVITE',   label: 'Interviews'   },
  { key: 'MESSAGE',            label: 'Messages'     },
] as const;

type TabKey = (typeof TABS)[number]['key'];

function timeAgo(iso: string) {
  const now = Date.now();
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return '';
  const diff = Math.max(0, Math.floor((now - ts) / 1000));
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  if (diff < 172800) return 'Yesterday';
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const ICON_STYLE: Record<string, { icon: string; bg: string; text: string }> = {
  JOB_APPLIED:        { icon: 'fa-file-alt',         bg: 'bg-emerald-100', text: 'text-emerald-600' },
  INTERVIEW_INVITE:   { icon: 'fa-calendar-check', bg: 'bg-amber-100',   text: 'text-amber-600'   },
  MESSAGE:            { icon: 'fa-comment',          bg: 'bg-sky-100',     text: 'text-sky-600'     },
  APPLICATION_UPDATE:  { icon: 'fa-arrow-right-arrow-left', bg: 'bg-rose-100', text: 'text-rose-600'  },
  SYSTEM:             { icon: 'fa-bell',              bg: 'bg-gray-100',    text: 'text-gray-500'    },
};

function getIconStyle(type: Notification['type']) {
  return ICON_STYLE[type] ?? ICON_STYLE['SYSTEM'];
}

function toTargetPath(n: Notification) {
  if (n.type === 'MESSAGE') {
    return n.referenceId ? `/messages/${n.referenceId}` : ROUTES.MESSAGES;
  }
  if (n.type === 'INTERVIEW_INVITE') return ROUTES.INTERVIEWS;
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
    const incoming = e.notification;
    setItems((prev) => {
      const existing = prev.findIndex((n) => n.id === incoming.id);
      if (existing >= 0) {
        return prev.map((n, idx) => (idx === existing ? incoming : n));
      }
      return [incoming, ...prev];
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
    try { await notificationService.markAllRead(); } catch { /* keep optimistic state */ }
  };

  const handleOpen = (n: Notification) => {
    if (!n.isRead) void handleMarkRead(n.id);
    const target = toTargetPath(n);
    if (target) navigate(target);
  };

  return (
    <>
      <Topbar title="Notifications" onMenuToggle={onMenuToggle} />
      <div className="p-6 lg:p-8 max-w-full mx-8 space-y-6">

        {/* Page Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Notifications</h2>
            <p className="text-sm text-gray-500 mt-1">Stay updated with your recruitment activities.</p>
          </div>
          <button
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 hover:-translate-y-px hover:shadow-sm transition-all duration-200 disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-none"
          >
            <i className="fas fa-check-double text-xs" />
            Mark All Read
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] text-center">
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* Tabs */}
        <div className="tab-segmented max-w-fit">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const count = tab.key === 'UNREAD' ? unreadCount : 0;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
                {count > 0 && (
                  <span className={`ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-white/25 text-white' : 'bg-red-500 text-white'
                  }`}>
                    {count > 99 ? '99+' : count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Notification List */}
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="py-16 flex justify-center">
              <div className="w-7 h-7 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon="fa-bell-slash"
              title="No notifications"
              description={
                activeTab === 'UNREAD'
                  ? "You're all caught up! No unread notifications."
                  : activeTab === 'ALL'
                  ? "You're all caught up! No notifications yet."
                  : `No ${TABS.find((t) => t.key === activeTab)?.label?.toLowerCase() ?? ''} notifications.`
              }
            />
          ) : (
            <div>
              {filtered.map((n, idx) => {
                const iconStyle = getIconStyle(n.type);
                const isUnread = !n.isRead;
                return (
                  <article
                    key={n.id}
                    className={`
                      group relative px-5 py-4 flex items-start gap-4 cursor-pointer
                      hover:bg-gray-50/60 transition-all duration-150 border-b border-gray-50 last:border-0
                      ${isUnread ? 'notification-unread' : ''}
                    `}
                    style={{
                      animationDelay: `${idx * 40}ms`,
                      borderLeft: isUnread ? '3px solid #19a633' : '3px solid transparent',
                    }}
                    onClick={() => handleOpen(n)}
                  >
                    {/* Icon */}
                    <div className={`w-10 h-10 rounded-xl ${iconStyle.bg} ${iconStyle.text} flex items-center justify-center shrink-0 mt-0.5 shadow-sm`}>
                      <i className={`fas ${iconStyle.icon}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 leading-snug">
                            {n.title}
                          </p>
                          {n.content && (
                            <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">
                              {n.content}
                            </p>
                          )}
                        </div>

                        {/* Unread dot + time */}
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <span className="text-[11px] text-gray-400 whitespace-nowrap">
                            {timeAgo(n.createdAt)}
                          </span>
                          {isUnread && (
                            <button
                              className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-full flex items-center justify-center text-primary hover:bg-emerald-50 transition-all duration-150"
                              title="Mark as read"
                              onClick={(e) => { e.stopPropagation(); void handleMarkRead(n.id); }}
                            >
                              <i className="fas fa-circle text-[8px]" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
