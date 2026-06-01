import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { chatService } from '../../services/chatService';
import { useRecruitProWebSocket } from '../../hooks/useWebSocket';
import { useAuthStore } from '../../store/authStore';
import type { Message, ChatEvent } from '../../types/chat';

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

export default function ChatRoomPage() {
  const { id: conversationId } = useParams<{ id: string }>();
  const [messages, setMessages]     = useState<Message[]>([]);
  const [input, setInput]           = useState('');
  const [sending, setSending]       = useState(false);
  const [loading, setLoading]       = useState(true);
  const bottomRef                   = useRef<HTMLDivElement>(null);
  const currentUserId               = useAuthStore((s) => s.user?.id);

  useEffect(() => {
    if (!conversationId) return;
    chatService.getMessages(conversationId).then((data) => {
      setMessages(data.content);
      setLoading(false);
    });
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleChatEvent = useCallback((event: ChatEvent) => {
    if (event.eventType === 'CHAT_MESSAGE' && event.conversationId === conversationId) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === event.message.id)) return prev;
        return [...prev, event.message];
      });
      sendReadReceipt({ conversationId: conversationId!, lastReadMessageId: event.message.id });
    }
  }, [conversationId]);

  const { sendMessage, sendReadReceipt } = useRecruitProWebSocket({
    conversationIds: conversationId ? [conversationId] : [],
    onChatEvent: handleChatEvent,
  });

  const handleSend = () => {
    if (!input.trim() || !conversationId || sending) return;
    setSending(true);
    const idempotencyKey = uuidv4();
    const optimisticMsg: Message & { idempotencyKey?: string } = {
      id: idempotencyKey,
      idempotencyKey,
      conversationId,
      senderId: currentUserId ?? '',
      senderRole: 'STAFF',
      content: input.trim(),
      type: 'TEXT',
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setInput('');
    sendMessage({ conversationId, content: optimisticMsg.content, type: 'TEXT', idempotencyKey });
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const convName = conversationId ?? '';

  return (
    <div className="flex flex-col h-[calc(100vh-57px)] bg-white">

      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 flex-shrink-0 bg-white">
        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${avatarStyle(convName)} flex items-center justify-center text-xs font-bold shadow-sm shrink-0`}>
          {getInitials(convName)}
        </div>
        <div>
          <div className="text-sm font-bold text-gray-900">Conversation</div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
            <span className="text-[11px] text-gray-400">Chat</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-gray-50/30">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-7 h-7 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
              <i className="fas fa-comment-dots text-3xl text-gray-300" />
            </div>
            <p className="text-sm font-semibold text-gray-500">No messages yet</p>
            <p className="text-xs text-gray-400 mt-1">Start the conversation below.</p>
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
                  <div className={`w-7 h-7 rounded-xl bg-gradient-to-br ${avatarStyle(convName)} flex items-center justify-center text-[10px] font-bold mr-2 shrink-0 self-end mb-0.5 shadow-sm`}>
                    {getInitials(convName)}
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
                    {formatTime(msg.createdAt)}
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
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message… (Enter to send)"
            className="flex-1 bg-transparent text-sm text-gray-800 resize-none outline-none max-h-32 placeholder:text-gray-400 leading-relaxed"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center hover:bg-primary-hover hover:-translate-y-px hover:shadow-md transition-all duration-200 disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-none flex-shrink-0 shadow-sm"
          >
            <i className="fas fa-paper-plane text-sm" />
          </button>
        </div>
      </div>
    </div>
  );
}
