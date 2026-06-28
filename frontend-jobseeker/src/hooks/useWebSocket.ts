import { useEffect, useRef, useCallback } from 'react';
import { Client, type IMessage } from '@stomp/stompjs';
import { useAuthStore } from '../store/authStore';
import type { ChatEvent, NotificationEvent, SendMessagePayload, ReadReceiptPayload } from '../types/chat';

function getWsUrl(): string {
  const raw = import.meta.env.VITE_API_URL ?? '';
  if (raw.startsWith('/')) {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${window.location.host}/ws-native`;
  }
  const apiBase = raw || 'http://127.0.0.1:8080';
  return apiBase.replace(/^http/, 'ws') + '/ws-native';
}

interface UseWebSocketOptions {
  conversationIds?: string[];
  onChatEvent?: (event: ChatEvent) => void;
  onNotification?: (event: NotificationEvent) => void;
}

export function useRecruitProWebSocket({
  conversationIds = [],
  onChatEvent,
  onNotification,
}: UseWebSocketOptions) {
  const clientRef = useRef<Client | null>(null);
  const reconnectDelay = useRef(2000);
  const onChatEventRef = useRef(onChatEvent);
  const onNotificationRef = useRef(onNotification);
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    onChatEventRef.current = onChatEvent;
    onNotificationRef.current = onNotification;
  }, [onChatEvent, onNotification]);

  const connect = useCallback(() => {
    if (!accessToken) return;

    const client = new Client({
      webSocketFactory: () => new WebSocket(getWsUrl()),
      connectHeaders: { Authorization: `Bearer ${accessToken}` },
      reconnectDelay: reconnectDelay.current,
      heartbeatIncoming: 25000,
      heartbeatOutgoing: 10000,

      onConnect: () => {
        reconnectDelay.current = 2000;

        conversationIds.forEach((convId) => {
          client.subscribe(`/topic/chat.${convId}`, (msg: IMessage) => {
            try {
              const event: ChatEvent = JSON.parse(msg.body);
              onChatEventRef.current?.(event);
            } catch { /* ignore */ }
          });
        });

        client.subscribe('/user/queue/notification', (msg: IMessage) => {
          try {
            const event: NotificationEvent = JSON.parse(msg.body);
            onNotificationRef.current?.(event);
          } catch { /* ignore */ }
        });
      },

      onStompError: () => {
        reconnectDelay.current = Math.min(reconnectDelay.current * 2, 30000);
      },
    });

    clientRef.current = client;
    client.activate();
  }, [accessToken, conversationIds.join(',')]);

  useEffect(() => {
    connect();

    const presencePing = setInterval(() => {
      if (clientRef.current?.connected) {
        clientRef.current.publish({ destination: '/app/presence.ping', body: '' });
      }
    }, 20000);

    return () => {
      clearInterval(presencePing);
      clientRef.current?.deactivate();
    };
  }, [connect]);

  const sendMessage = useCallback((payload: SendMessagePayload) => {
    if (!clientRef.current?.connected) return false;

    clientRef.current?.publish({
      destination: '/app/chat.send',
      body: JSON.stringify(payload),
    });
    return true;
  }, []);

  const sendReadReceipt = useCallback((payload: ReadReceiptPayload) => {
    if (!clientRef.current?.connected) return false;

    clientRef.current?.publish({
      destination: '/app/chat.read',
      body: JSON.stringify(payload),
    });
    return true;
  }, []);

  return {
    sendMessage,
    sendReadReceipt,
    isConnected: () => clientRef.current?.connected ?? false,
  };
}
