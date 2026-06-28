import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
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

function sortByLastMessageAt(list: Conversation[]) {
  return [...list].sort((a, b) => {
    const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return bTime - aTime;
  });
}

const COLORS = [
  { bg: 'bg-blue-50', text: 'text-blue-600' },
  { bg: 'bg-violet-50', text: 'text-violet-600' },
  { bg: 'bg-emerald-50', text: 'text-emerald-600' },
  { bg: 'bg-amber-50', text: 'text-amber-600' },
  { bg: 'bg-rose-50', text: 'text-rose-600' },
];
function avatarColor(id?: string) {
  if (!id) return COLORS[0];
  return COLORS[id.charCodeAt(0) % COLORS.length];
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
  const lastReadSyncRef = useRef<string | null>(null);
  const conversationIds = useMemo(() => conversations.map((c) => c.id), [conversations]);

  useEffect(() => {
    chatService.listConversations()
      .then((list) => {
        setConversations(list);
        if (!activeId && list.length > 0) setActiveId(list[0].id);
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
            const isCloseInTime = Number.isFinite(incomingTime) && Number.isFinite(localTime) && Math.abs(incomingTime - localTime) <= 15000;
            return isCloseInTime && m.type === event.message.type && (m.content ?? '') === (event.message.content ?? '') && (m.fileName ?? '') === (event.message.fileName ?? '');
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
      setConversations((prev) => sortByLastMessageAt(
        prev.map((c) => {
          if (c.id !== event.conversationId) return c;
          const isActiveConversation = c.id === activeId;
          const isOwnMessage = event.message.senderId === currentUserId;

          return {
            ...c,
            lastMessage: event.message.content ?? event.message.fileName,
            lastMessageAt: event.message.createdAt,
            unreadCount: isActiveConversation || isOwnMessage ? 0 : c.unreadCount + 1,
          };
        })
      ));
    }
  }, [activeId, currentUserId]);

  const handleNotification = useCallback((e: NotificationEvent) => {
    if (e.eventType === 'NOTIFICATION_COUNT') return;
  }, []);

  const { sendMessage, sendReadReceipt } = useRecruitProWebSocket({
    conversationIds,
    onChatEvent: handleChatEvent,
    onNotification: handleNotification,
  });

  useEffect(() => {
    if (!activeId || loadingMsgs || messages.length === 0) return;
    const latest = messages[messages.length - 1];
    const syncKey = `${activeId}:${latest.id}`;
    if (lastReadSyncRef.current === syncKey) return;

    const sent = sendReadReceipt({ conversationId: activeId, lastReadMessageId: latest.id });
    if (!sent) return;

    lastReadSyncRef.current = syncKey;
    setConversations((prev) =>
      prev.map((c) => (c.id === activeId ? { ...c, unreadCount: 0 } : c))
    );
  }, [activeId, loadingMsgs, messages, sendReadReceipt]);

  const activeConv = conversations.find((c) => c.id === activeId);
  const canReply = (activeConv?.isInitiated ?? false) || messages.length > 0;

  const handleSend = () => {
    if (!input.trim() || !activeId || !canReply) return;
    const idempotencyKey = uuidv4();

    const optimistic: Message = {
      id: idempotencyKey,
      idempotencyKey,
      conversationId: activeId,
      senderId: currentUserId ?? '',
      senderRole: 'JOBSEEKER',
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

  const filtered = conversations.filter((c) => {
    const q = search.toLowerCase();
    return (c.staffName ?? '').toLowerCase().includes(q) || (c.lastMessage ?? '').toLowerCase().includes(q);
  });

  return (
    <div className="flex rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm" style={{ height: 'calc(100vh - 160px)', minHeight: 500 }}>
      {/* Conversation Sidebar */}
      <aside className="w-[300px] flex-shrink-0 border-r border-gray-100 flex flex-col bg-gray-50/40">
        {/* Sidebar header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">Messages</h2>
          <span className="text-xs text-gray-400">{filtered.length}</span>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="relative">
            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-xs" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-white border border-gray-100 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {loadingConvs ? (
            <div className="py-12 flex items-center justify-center">
              <div className="w-7 h-7 border-[2.5px] border-gray-100 border-t-primary rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <i className="fas fa-comments text-3xl text-gray-200 mb-3 block" />
              <p className="text-sm text-gray-400">
                {search ? 'No results found' : 'No messages yet.'}
              </p>
            </div>
          ) : (
            filtered.map((conv) => {
              const colors = avatarColor(conv.id);
              const isActive = conv.id === activeId;
              const isUnread = conv.unreadCount > 0;
              return (
                <button
                  key={conv.id}
                  onClick={() => handleSelectConv(conv.id)}
                  className={`relative w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all duration-150 border-b border-gray-50/60 ${
                    isActive
                      ? 'bg-amber-50 ring-1 ring-inset ring-amber-200 border-l-2 border-l-transparent shadow-sm'
                      : isUnread
                        ? 'bg-blue-50/70 hover:bg-blue-50 border-l-2 border-l-primary'
                        : 'hover:bg-white border-l-2 border-l-transparent'
                  }`}
                >
                  {isActive && (
                    <span className="absolute left-0 top-2 bottom-2 w-1.5 rounded-r-full bg-amber-500 shadow-sm" />
                  )}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                    isActive
                      ? 'bg-amber-500 text-white shadow-sm'
                      : isUnread
                        ? 'bg-primary text-white shadow-sm'
                        : `${colors.bg} ${colors.text}`
                  }`}>
                    {getInitials(conv.staffName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm truncate ${isActive ? 'font-bold text-amber-950' : isUnread ? 'font-bold text-gray-950' : 'font-medium text-gray-700'}`}>
                        {conv.staffName ?? 'Recruiter'}
                      </span>
                      <span className={`text-[11px] flex-shrink-0 ml-2 ${isActive ? 'font-semibold text-amber-600' : isUnread ? 'font-semibold text-primary' : 'text-gray-400'}`}>
                        {formatTime(conv.lastMessageAt)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs truncate ${isActive ? 'font-medium text-amber-700' : isUnread ? 'font-semibold text-gray-700' : 'text-gray-400'}`}>
                        {conv.lastMessage || 'Start a conversation'}
                      </span>
                      {isUnread && (
                        <span className="ml-2 flex-shrink-0 min-w-5 h-5 rounded-full bg-primary px-1.5 text-white text-[10px] font-bold flex items-center justify-center shadow-sm">
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

      {/* Chat Main */}
      {activeConv ? (
        <div className="flex-1 flex flex-col min-w-0 bg-white">
          {/* Chat Header */}
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3 flex-shrink-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 ${avatarColor(activeConv.id).bg} ${avatarColor(activeConv.id).text}`}>
              {getInitials(activeConv.staffName)}
            </div>
            <div>
              <div className="text-sm font-bold text-gray-900">{activeConv.staffName ?? 'Recruiter'}</div>
              <div className="text-xs text-gray-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                {canReply ? 'Active conversation' : 'Waiting for recruiter'}
              </div>
            </div>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-6 py-5 bg-gray-50/40">
            {loadingMsgs ? (
              <div className="py-12 flex items-center justify-center">
                <div className="w-7 h-7 border-[2.5px] border-gray-100 border-t-primary rounded-full animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-comments text-2xl text-gray-300" />
                </div>
                <p className="text-sm font-medium text-gray-500 mb-1">No messages yet</p>
                <p className="text-xs text-gray-400">The recruiter will send a message here to start the conversation.</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isOwn = msg.senderId === currentUserId;
                return (
                  <div key={msg.id} className={`flex items-end gap-2 mb-3 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                    {!isOwn && (
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 mb-1 ${avatarColor(activeConv.id).bg} ${avatarColor(activeConv.id).text}`}>
                        {getInitials(activeConv.staffName)}
                      </div>
                    )}
                    <div className={`max-w-[70%] rounded-2xl px-4 py-3 shadow-sm ${
                      isOwn
                        ? 'bg-primary text-white rounded-br-md'
                        : 'bg-white border border-gray-100 text-gray-700 rounded-bl-md'
                    }`}>
                      {msg.type === 'FILE' ? (
                        <a href={msg.fileUrl} target="_blank" rel="noreferrer"
                          className={`flex items-center gap-2 text-sm ${isOwn ? 'text-white/90' : 'text-primary'} no-underline hover:underline`}>
                          <i className="fas fa-paperclip" />
                          <span>{msg.fileName ?? 'File'}</span>
                        </a>
                      ) : (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words" style={{ margin: 0 }}>{msg.content}</p>
                      )}
                      <p className={`text-[10px] mt-1.5 opacity-60 ${isOwn ? 'text-right' : ''}`}>
                        {formatTime(msg.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          <div className="px-6 py-3 border-t border-gray-100 flex-shrink-0 bg-white">
            {!canReply ? (
              <div className="flex items-center justify-center gap-2 py-3 text-xs text-gray-400 bg-gray-50 rounded-xl border border-gray-100">
                <i className="fas fa-lock text-[10px]" />
                You can reply once the recruiter sends the first message.
              </div>
            ) : (
              <div className="flex items-center gap-3 bg-gray-50/80 border border-gray-100 rounded-2xl px-4 py-2 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
                <textarea
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Write a reply… (Enter to send)"
                  className="flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-400 resize-none !border-0 !shadow-none !p-0 outline-none focus:!border-0 focus:!shadow-none focus:!ring-0 leading-relaxed max-h-28"
                  style={{ fontFamily: 'inherit' }}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-150 ${
                    input.trim()
                      ? 'bg-primary text-white hover:bg-primary-hover shadow-sm cursor-pointer'
                      : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                  }`}
                >
                  <i className="fas fa-paper-plane text-xs" />
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-gray-50/40">
          <div className="text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-comments text-3xl text-gray-300" />
            </div>
            <p className="text-sm font-semibold text-gray-500">Select a conversation</p>
            <p className="text-xs text-gray-400 mt-1">Your recruiter messages will appear here</p>
          </div>
        </div>
      )}
    </div>
  );
}
