import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { chatService } from '../../services/chatService';
import { useRecruitProWebSocket } from '../../hooks/useWebSocket';
import { useAuthStore } from '../../store/authStore';
import type { Message, ChatEvent } from '../../types/chat';

export default function ChatRoomPage() {
  const { id: conversationId } = useParams<{ id: string }>();
  const [messages, setMessages]  = useState<Message[]>([]);
  const [input, setInput]        = useState('');
  const [loading, setLoading]    = useState(true);
  const [canReply, setCanReply]  = useState(false); // can only reply once staff initiated
  const bottomRef                = useRef<HTMLDivElement>(null);
  const currentUserId            = useAuthStore((s) => s.user?.id);

  useEffect(() => {
    if (!conversationId) return;
    chatService.getMessages(conversationId).then((data) => {
      setMessages(data.content);
      setCanReply(data.content.length > 0); // can reply once staff sent at least 1 message
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
      setCanReply(true);
      sendReadReceipt({
        conversationId: conversationId!,
        lastReadMessageId: event.message.id,
      });
    }
  }, [conversationId]);

  const { sendMessage, sendReadReceipt } = useRecruitProWebSocket({
    conversationIds: conversationId ? [conversationId] : [],
    onChatEvent: handleChatEvent,
  });

  const handleSend = () => {
    if (!input.trim() || !conversationId || !canReply) return;

    const idempotencyKey = uuidv4();
    const optimistic: Message = {
      id: idempotencyKey,
      conversationId,
      senderId: currentUserId ?? '',
      senderRole: 'JOBSEEKER',
      content: input.trim(),
      type: 'TEXT',
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimistic]);
    setInput('');
    sendMessage({ conversationId, content: input.trim(), type: 'TEXT', idempotencyKey });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] max-w-3xl mx-auto bg-white rounded-2xl border overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b flex items-center gap-3 bg-white">
        <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-semibold text-sm">
          <i className="fas fa-user-tie" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">Recruiter</p>
          <p className="text-xs text-emerald-500">Connected</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-gray-50/40">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 text-sm mt-12">
            <i className="fas fa-comments text-3xl text-gray-200 mb-3 block" />
            Waiting for the recruiter to start the conversation.
          </div>
        )}
        {messages.map((msg) => {
          const isOwn = msg.senderId === currentUserId;
          return (
            <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
                  isOwn
                    ? 'bg-emerald-500 text-white rounded-br-sm'
                    : 'bg-white text-gray-800 rounded-bl-sm border'
                }`}
              >
                {msg.type === 'FILE' ? (
                  <a href={msg.fileUrl} target="_blank" rel="noreferrer"
                    className="flex items-center gap-2 underline">
                    <i className="fas fa-paperclip" />
                    <span className="truncate">{msg.fileName ?? 'File'}</span>
                  </a>
                ) : (
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                )}
                <p className={`text-[10px] mt-1 ${isOwn ? 'text-white/60' : 'text-gray-400'} text-right`}>
                  {formatTime(msg.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input — disabled until recruiter sends first message */}
      <div className="px-4 py-3 border-t bg-white">
        {!canReply ? (
          <p className="text-xs text-center text-gray-400 py-2">
            <i className="fas fa-lock mr-1" />
            You can reply once the recruiter sends the first message.
          </p>
        ) : (
          <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-2">
            <textarea
              id="chat-input"
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a reply… (Enter to send)"
              className="flex-1 bg-transparent text-sm text-gray-800 resize-none !border-0 !shadow-none !p-0 outline-none focus:!border-0 focus:!shadow-none focus:!ring-0 max-h-32 placeholder:text-gray-400"
            />
            <button
              id="send-btn"
              onClick={handleSend}
              disabled={!input.trim()}
              className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600 transition-colors disabled:opacity-40 flex-shrink-0"
            >
              <i className="fas fa-paper-plane text-sm" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
