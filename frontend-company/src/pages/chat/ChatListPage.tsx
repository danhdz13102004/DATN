import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { chatService } from '../../services/chatService';
import { useRecruitProWebSocket } from '../../hooks/useWebSocket';
import { useAuthStore } from '../../store/authStore';
import type { Conversation, Message, ChatEvent, NotificationEvent } from '../../types/chat';

function getInitials(name?: string) {
  if (!name) return '?';
  return name.split(/[\s@]/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');
}

function formatTime(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString();
}

const AVATAR_STYLES = [
  'from-emerald-50 to-teal-50 text-emerald-600',
  'from-blue-50 to-indigo-50 text-blue-600',
  'from-violet-50 to-purple-50 text-violet-600',
  'from-amber-50 to-orange-50 text-amber-600',
  'from-rose-50 to-pink-50 text-rose-600',
];

function avatarStyle(id?: string) {
  if (!id) return AVATAR_STYLES[0];
  return AVATAR_STYLES[id.charCodeAt(0) % AVATAR_STYLES.length];
}

export default function MessagesPage() {
  const { id: urlConvId } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const currentUserId = useAuthStore((s) => s.user?.id);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | undefined>(urlConvId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatService.listConversations()
      .then((list) => {
        setConversations(list);
        if (!activeId && list.length > 0) {
          setActiveId(list[0].id);
        }
      })
      .finally(() => setLoadingConvs(false));
  }, []);

  useEffect(() => {
    if (!activeId) return;
    setLoadingMsgs(true);
    setMessages([]);
    chatService.getMessages(activeId)
      .then((data) => setMessages(data.content))
      .finally(() => setLoadingMsgs(false));
  }, [activeId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleChatEvent = useCallback((event: ChatEvent) => {
    if (event.eventType === 'CHAT_MESSAGE' && event.conversationId === activeId) {
      setMessages((prev) => {
        const incomingIdem = event.message.idempotencyKey;
        const incomingTime = new Date(event.message.createdAt).getTime();
        const optimisticIndex = prev.findIndex((m) => {
          if (m.id === event.message.id) return true;
          if (incomingIdem && (m.id === incomingIdem || m.idempotencyKey === incomingIdem)) return true;
          if (!incomingIdem && m.idempotencyKey && event.message.senderId === currentUserId) {
            const localTime = new Date(m.createdAt).getTime();
            const isCloseInTime = Number.isFinite(incomingTime) && Number.isFinite(localTime)
              && Math.abs(incomingTime - localTime) <= 15000;
            return isCloseInTime
              && m.type === event.message.type
              && (m.content ?? '') === (event.message.content ?? '')
              && (m.fileName ?? '') === (event.message.fileName ?? '');
          }
          return false;
        });
        if (optimisticIndex >= 0) {
          return prev.map((m, idx) => (idx === optimisticIndex ? event.message : m));
        }
        return [...prev, event.message];
      });
      sendReadReceipt({ conversationId: activeId!, lastReadMessageId: event.message.id });
    }
    if (event.eventType === 'CHAT_MESSAGE') {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === event.conversationId
            ? { ...c, lastMessage: event.message.content ?? event.message.fileName, lastMessageAt: event.message.createdAt }
            : c
        )
      );
    }
  }, [activeId, currentUserId]);

  const handleNotification = useCallback((e: NotificationEvent) => {
    if (e.notification?.type === 'MESSAGE') {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === e.notification?.referenceId
            ? { ...c, unreadCount: c.id === activeId ? 0 : c.unreadCount + 1 }
            : c
        )
      );
    }
  }, [activeId]);

  const { sendMessage, sendReadReceipt } = useRecruitProWebSocket({
    conversationIds: activeId ? [activeId] : [],
    onChatEvent: handleChatEvent,
    onNotification: handleNotification,
  });

  const handleSend = () => {
    if (!input.trim() || !activeId) return;
    const idempotencyKey = uuidv4();
    const optimistic: Message & { idempotencyKey?: string } = {
      id: idempotencyKey,
      idempotencyKey,
      conversationId: activeId,
      senderId: currentUserId ?? '',
      senderRole: 'STAFF',
      content: input.trim(),
      type: 'TEXT',
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setInput('');
    sendMessage({ conversationId: activeId, content: optimistic.content, type: 'TEXT', idempotencyKey });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleSelectConv = (id: string) => {
    setActiveId(id);
    navigate(`/messages/${id}`, { replace: true });
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c))
    );
  };

  const activeConv = conversations.find((c) => c.id === activeId);
  const filtered = conversations.filter((c) => {
    const q = search.toLowerCase();
    return (c.jobSeekerName ?? '').toLowerCase().includes(q) || (c.lastMessage ?? '').toLowerCase().includes(q);
  });

  return (
    <div className="flex h-[calc(100vh-57px)] mx-4 overflow-hidden">

      {/* ── Conversation Sidebar ─────────────────────────────────────────── */}
      <aside className="w-72 flex-shrink-0 border-r border-gray-100 bg-white flex flex-col">

        {/* Header */}
        <div className="px-4 py-4 border-b border-gray-50">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <i className="fas fa-comment-dots text-sm" />
            </div>
            <h2 className="text-base font-bold text-gray-900">Messages</h2>
          </div>
          {/* Search */}
          <div className="relative">
            <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
            <input
              id="chat-search"
              type="text"
              placeholder="Search conversations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loadingConvs ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-12 px-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                <i className="fas fa-comments text-2xl text-gray-300" />
              </div>
              <p className="text-sm font-medium text-gray-500">{search ? 'No results found' : 'No conversations yet'}</p>
              {search && <p className="text-xs text-gray-400 mt-1">Try a different search term.</p>}
            </div>
          ) : (
            filtered.map((conv) => {
              const avStyle = avatarStyle(conv.id);
              return (
                <button
                  key={conv.id}
                  id={`conv-item-${conv.id}`}
                  onClick={() => handleSelectConv(conv.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all duration-150 hover:bg-gray-50 border-l-3 ${
                    conv.id === activeId
                      ? 'border-l-primary bg-primary/5'
                      : 'border-l-transparent'
                  }`}
                >
                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${avStyle} flex items-center justify-center text-xs font-bold shadow-sm shrink-0 flex-shrink-0`}>
                    {getInitials(conv.jobSeekerName)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-sm truncate ${conv.unreadCount > 0 ? 'font-bold text-gray-900' : 'font-semibold text-gray-800'}`}>
                        {conv.jobSeekerName ?? 'Job Seeker'}
                      </span>
                      <span className="text-[10px] text-gray-400 shrink-0">
                        {formatTime(conv.lastMessageAt)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5 gap-2">
                      <span className={`text-xs truncate ${conv.unreadCount > 0 ? 'text-gray-600 font-medium' : 'text-gray-400'}`}>
                        {conv.lastMessage ?? (conv.isInitiated ? '—' : 'Start a conversation')}
                      </span>
                      {conv.unreadCount > 0 && (
                        <span className="shrink-0 w-5 h-5 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                          {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* ── Chat Main ────────────────────────────────────────────────────── */}
      {activeConv ? (
        <div className="flex-1 flex flex-col min-w-0 bg-white">

          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 flex-shrink-0 bg-white">
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${avatarStyle(activeConv.id)} flex items-center justify-center text-xs font-bold shadow-sm shrink-0`}>
              {getInitials(activeConv.jobSeekerName)}
            </div>
            <div>
              <div className="text-sm font-bold text-gray-900">{activeConv.jobSeekerName ?? 'Job Seeker'}</div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                <span className="text-[11px] text-gray-400">Active</span>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-gray-50/30">
            {loadingMsgs ? (
              <div className="flex justify-center py-12">
                <div className="w-7 h-7 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                  <i className="fas fa-comment-dots text-3xl text-gray-300" />
                </div>
                <p className="text-sm font-semibold text-gray-500">No messages yet</p>
                <p className="text-xs text-gray-400 mt-1">Send the first message to start the conversation.</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isOwn = msg.senderId === currentUserId;
                return (
                  <div
                    key={msg.id}
                    className={`flex chat-bubble-in ${isOwn ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isOwn && (
                      <div className={`w-7 h-7 rounded-xl bg-gradient-to-br ${avatarStyle(activeConv.id)} flex items-center justify-center text-[10px] font-bold mr-2 shrink-0 self-end mb-0.5 shadow-sm`}>
                        {getInitials(activeConv.jobSeekerName)}
                      </div>
                    )}
                    <div
                      className={`max-w-[68%] px-4 py-3 rounded-2xl text-sm shadow-sm transition-all duration-150 ${
                        isOwn
                          ? 'bg-primary text-white rounded-br-sm'
                          : 'bg-white text-gray-800 rounded-bl-sm border border-gray-100'
                      }`}
                    >
                      {msg.type === 'FILE' ? (
                        <a
                          href={msg.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className={`flex items-center gap-2 ${isOwn ? 'text-white/90' : 'text-primary'}`}
                        >
                          <i className="fas fa-paperclip text-xs" />
                          <span className="truncate text-xs underline">{msg.fileName ?? 'File'}</span>
                        </a>
                      ) : (
                        <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                      )}
                      <p className={`text-[10px] mt-1.5 ${isOwn ? 'text-white/50 text-right' : 'text-gray-400'}`}>
                        {isOwn ? 'You' : activeConv.jobSeekerName?.split(' ')[0]} · {formatTime(msg.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-t border-gray-100 flex-shrink-0 bg-white">
            <div className="flex items-end gap-2 bg-gray-50 border border-gray-100 rounded-2xl px-4 py-2.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 transition-all">
              <textarea
                id="chat-input"
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message… (Enter to send)"
                className="flex-1 bg-transparent text-sm text-gray-800 resize-none !border-0 !shadow-none outline-none focus:!border-0 focus:!shadow-none focus:!ring-0 max-h-32 placeholder:text-gray-400 leading-relaxed"
              />
              <button
                id="send-btn"
                onClick={handleSend}
                disabled={!input.trim()}
                className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center hover:bg-primary-hover hover:-translate-y-px hover:shadow-md transition-all duration-200 disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-none flex-shrink-0 shadow-sm"
              >
                <i className="fas fa-paper-plane text-sm" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-gray-50/40">
          <div className="text-center">
            <div className="w-20 h-20 rounded-2xl bg-white shadow-card flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-comment-dots text-3xl text-gray-300" />
            </div>
            <p className="text-sm font-semibold text-gray-500">Select a conversation</p>
            <p className="text-xs text-gray-400 mt-1">or start one from an Application</p>
          </div>
        </div>
      )}
    </div>
  );
}
