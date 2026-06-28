import api from './api';
import type { Conversation, Message, Notification } from '../types/chat';

const BASE = '/chat';
const NOTIF = '/notifications';

export const chatService = {
  listConversations: async (): Promise<Conversation[]> => {
    const res = await api.get(`${BASE}/conversations`);
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

  unreadCount: async (): Promise<number> => {
    const res = await api.get(`${BASE}/unread-count`);
    return res.data.data.unreadCount;
  },
};

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
