import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { chatService } from '../../services/chatService';
import { useRecruitProWebSocket } from '../../hooks/useWebSocket';
import { useAuthStore } from '../../store/authStore';
import type { Conversation, Message, ChatEvent, NotificationEvent } from '../../types/chat';

// ── helpers ──────────────────────────────────────────────────────────────────

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

const COLORS = [
  'bg-primary/10 text-primary',
  'bg-blue-100 text-blue-700',
  'bg-red-100 text-red-600',
  'bg-amber-100 text-amber-700',
  'bg-purple-100 text-purple-700',
];
function avatarColor(id?: string) {
  if (!id) return COLORS[0];
  return COLORS[id.charCodeAt(0) % COLORS.length];
}

// ── main component ────────────────────────────────────────────────────────────

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

  // ── Load conversation list ─────────────────────────────────────────────────
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

  // ── Load messages when active conversation changes ─────────────────────────
  useEffect(() => {
    if (!activeId) return;
    setLoadingMsgs(true);
    setMessages([]);
    chatService.getMessages(activeId)
      .then((data) => setMessages(data.content))
      .finally(() => setLoadingMsgs(false));
  }, [activeId]);

  // ── Scroll to bottom on new messages ──────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── WebSocket event handlers ───────────────────────────────────────────────
  const handleChatEvent = useCallback((event: ChatEvent) => {
    if (event.eventType === 'CHAT_MESSAGE' && event.conversationId === activeId) {
      setMessages((prev) => {
        const incomingIdem = event.message.idempotencyKey;
        const incomingTime = new Date(event.message.createdAt).getTime();
        const optimisticIndex = prev.findIndex((m) => {
          if (m.id === event.message.id) return true;
          if (incomingIdem && (m.id === incomingIdem || m.idempotencyKey === incomingIdem)) return true;

          // Fallback for servers that do not echo idempotencyKey in websocket payloads.
          if (!incomingIdem && m.idempotencyKey && event.message.senderId === currentUserId) {
            const localTime = new Date(m.createdAt).getTime();
            const isCloseInTime = Number.isFinite(incomingTime)
              && Number.isFinite(localTime)
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
    // Update last message preview in sidebar
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
    if (e.notification.type === 'MESSAGE') {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === e.notification.referenceId
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

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSend = () => {
    if (!input.trim() || !activeId) return;
    const idempotencyKey = uuidv4();

    // Optimistic — use idempotencyKey as temp id so we can replace it later
    const optimistic: Message & { idempotencyKey?: string } = {
      id: idempotencyKey,           // temp id = idem key for matching
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
    // Clear unread badge
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c))
    );
  };

  const activeConv = conversations.find((c) => c.id === activeId);
  const filtered = conversations.filter((c) => {
    const q = search.toLowerCase();
    return (c.jobSeekerName ?? '').toLowerCase().includes(q) || (c.lastMessage ?? '').toLowerCase().includes(q);
  });

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="chat-layout flex h-[calc(100vh-57px)] overflow-hidden">

      {/* ── Conversation Sidebar ─────────────────────────────────────────── */}
      <aside className="w-72 flex-shrink-0 border-r border-gray-100 bg-white flex flex-col">
        {/* Search */}
        <div className="p-4 border-b border-gray-100">
          <div className="relative">
            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
            <input
              id="chat-search"
              type="text"
              placeholder="Search conversations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-primary transition-colors"
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
            <div className="text-center py-10 text-gray-400 text-sm px-4">
              <i className="fas fa-comments text-2xl text-gray-200 mb-2 block" />
              {search ? 'No results found' : 'No conversations yet'}
            </div>
          ) : (
            filtered.map((conv) => (
              <button
                key={conv.id}
                id={`conv-item-${conv.id}`}
                onClick={() => handleSelectConv(conv.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 border-l-2 ${
                  conv.id === activeId ? 'border-primary bg-primary/5' : 'border-transparent'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 ${avatarColor(conv.id)}`}>
                  {getInitials(conv.jobSeekerName)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm truncate ${conv.unreadCount > 0 ? 'font-bold text-gray-900' : 'font-medium text-gray-800'}`}>
                      {conv.jobSeekerName ?? 'Job Seeker'}
                    </span>
                    <span className="text-[10px] text-gray-400 ml-2 flex-shrink-0">{formatTime(conv.lastMessageAt)}</span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    {/* <span className={`text-xs truncate ${conv.unreadCount > 0 ? 'text-gray-700' : 'text-gray-400'}`}>
                      {conv.lastMessage ?? (conv.isInitiated ? '—' : 'Not started')}
                    </span> */}
                    {conv.unreadCount > 0 && (
                      <span className="ml-2 flex-shrink-0 w-5 h-5 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* ── Chat Main ────────────────────────────────────────────────────── */}
      {activeConv ? (
        <div className="flex-1 flex flex-col min-w-0 bg-white">
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 flex-shrink-0">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold ${avatarColor(activeConv.id)}`}>
              {getInitials(activeConv.jobSeekerName)}
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900">{activeConv.jobSeekerName ?? 'Job Seeker'}</div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-gray-50/40">
            {loadingMsgs ? (
              <div className="flex justify-center py-12">
                <div className="w-7 h-7 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center text-gray-400 text-sm mt-16">
                <i className="fas fa-comments text-4xl text-gray-200 mb-3 block" />
                No messages yet — send the first message to start the conversation.
              </div>
            ) : (
              messages.map((msg) => {
                const isOwn = msg.senderId === currentUserId;
                return (
                  <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    {!isOwn && (
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold mr-2 flex-shrink-0 self-end mb-1 ${avatarColor(activeConv.id)}`}>
                        {getInitials(activeConv.jobSeekerName)}
                      </div>
                    )}
                    <div className={`max-w-[68%] px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
                      isOwn ? 'bg-primary text-white rounded-br-sm' : 'bg-white text-gray-800 rounded-bl-sm border border-gray-100'
                    }`}>
                      {msg.type === 'FILE' ? (
                        <a href={msg.fileUrl} target="_blank" rel="noreferrer"
                          className={`flex items-center gap-2 ${isOwn ? 'text-white/90' : 'text-primary'}`}>
                          <i className="fas fa-paperclip text-xs" />
                          <span className="truncate text-xs underline">{msg.fileName ?? 'File'}</span>
                        </a>
                      ) : (
                        <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                      )}
                      <p className={`text-[10px] mt-1.5 ${isOwn ? 'text-white/60 text-right' : 'text-gray-400'}`}>
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
            <div className="flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus-within:border-primary transition-colors">
              <textarea
                id="chat-input"
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
                className="flex-1 bg-transparent text-sm text-gray-800 resize-none outline-none max-h-32 placeholder:text-gray-400 leading-relaxed"
              />
              <button
                id="send-btn"
                onClick={handleSend}
                disabled={!input.trim()}
                className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-40 flex-shrink-0 self-end"
              >
                <i className="fas fa-paper-plane text-sm" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-gray-50/40">
          <div className="text-center text-gray-400">
            <i className="fas fa-comments text-5xl text-gray-200 mb-4 block" />
            <p className="text-sm font-medium">Select a conversation</p>
            <p className="text-xs text-gray-300 mt-1">or start one from an Application</p>
          </div>
        </div>
      )}
    </div>
  );
}
