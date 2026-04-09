import api from './api';
import type { Conversation, Message, Notification, SendMessagePayload } from '../types/chat';

const BASE = '/chat';
const NOTIF = '/notifications';

// ── Conversations ──────────────────────────────────────────────────────────

export const chatService = {
  listConversations: async (): Promise<Conversation[]> => {
    const res = await api.get(`${BASE}/conversations`);
    return res.data.data;
  },

  createConversation: async (applicationId: string): Promise<Conversation> => {
    const res = await api.post(`${BASE}/conversations`, { applicationId });
    return res.data.data;
  },

  getMessages: async (conversationId: string, page = 0, size = 30): Promise<{
    content: Message[];
    totalPages: number;
    number: number;
  }> => {
    const res = await api.get(`${BASE}/conversations/${conversationId}/messages`, {
      params: { page, size },
    });
    return res.data.data;
  },

  getUploadUrl: async (conversationId: string, fileName: string, fileType: string, fileSizeBytes: number) => {
    const res = await api.post(`${BASE}/conversations/${conversationId}/upload-url`, {
      fileName, fileType, fileSizeBytes,
    });
    return res.data.data as { fileKey: string };
  },
};

// ── Notifications ──────────────────────────────────────────────────────────

export const notificationService = {
  list: async (page = 0, size = 20): Promise<{ content: Notification[]; totalPages: number }> => {
    const res = await api.get(NOTIF, { params: { page, size } });
    return res.data.data;
  },

  unreadCount: async (): Promise<number> => {
    const res = await api.get(`${NOTIF}/unread-count`);
    return res.data.data.unreadCount;
  },

  markRead: async (id: string): Promise<void> => {
    await api.patch(`${NOTIF}/${id}/read`);
  },

  markAllRead: async (): Promise<void> => {
    await api.patch(`${NOTIF}/read-all`);
  },
};
