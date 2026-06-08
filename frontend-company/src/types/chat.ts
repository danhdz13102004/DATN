// Chat & Notification TypeScript types

export interface Conversation {
  id: string;
  applicationId: string;
  staffId: string;
  staffName?: string;
  jobSeekerId: string;
  jobSeekerName?: string;
  isInitiated: boolean;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName?: string;
  senderRole?: 'STAFF' | 'JOBSEEKER';
  content?: string;
  type: 'TEXT' | 'FILE';
  fileUrl?: string;
  fileName?: string;
  fileSizeBytes?: number;
  isRead: boolean;
  createdAt: string;
  /** Present on optimistic messages; used to replace them when real message arrives */
  idempotencyKey?: string;
}

export interface ChatMessageEvent {
  eventType: 'CHAT_MESSAGE';
  conversationId: string;
  message: Message;
}

export interface ReadReceiptEvent {
  eventType: 'READ_RECEIPT';
  conversationId: string;
  readerId: string;
  lastReadMessageId: string;
  readAt: string;
}

export type ChatEvent = ChatMessageEvent | ReadReceiptEvent;

export interface Notification {
  id: string;
  type: 'JOB_APPLIED' | 'INTERVIEW_INVITE' | 'MESSAGE' | 'APPLICATION_UPDATE' | 'JOB_DELETED';
  title: string;
  content: string;
  isRead: boolean;
  referenceId?: string;
  referenceType?: string;
  createdAt: string;
}

export interface NotificationEvent {
  eventType: 'NOTIFICATION' | 'NOTIFICATION_READ' | 'NOTIFICATION_COUNT';
  userId: string;
  notification?: Notification;
  unreadCount: number;
}

export interface SendMessagePayload {
  conversationId: string;
  content?: string;
  type: 'TEXT' | 'FILE';
  fileKey?: string;
  fileName?: string;
  fileSizeBytes?: number;
  idempotencyKey: string;
}

export interface ReadReceiptPayload {
  conversationId: string;
  lastReadMessageId: string;
}
