import { useEffect, useRef, useCallback } from 'react';
import { Client, type IMessage } from '@stomp/stompjs';
import { useAuthStore } from '../store/authStore';
import type { ChatEvent, NotificationEvent, SendMessagePayload, ReadReceiptPayload } from '../types/chat';

// Derive WebSocket URL from the REST API URL (http→ws, https→wss)
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
  const accessToken = useAuthStore((s) => s.accessToken);

  const connect = useCallback(() => {
    if (!accessToken) return;

    const client = new Client({
      // Native WebSocket factory — no sockjs-client needed
      webSocketFactory: () => new WebSocket(getWsUrl()),
      connectHeaders: { Authorization: `Bearer ${accessToken}` },
      reconnectDelay: reconnectDelay.current,
      heartbeatIncoming: 25000,
      heartbeatOutgoing: 10000,

      onConnect: () => {
        reconnectDelay.current = 2000; // reset on successful connect

        // Subscribe to each conversation topic
        conversationIds.forEach((convId) => {
          client.subscribe(`/topic/chat.${convId}`, (msg: IMessage) => {
            try {
              const event: ChatEvent = JSON.parse(msg.body);
              onChatEvent?.(event);
            } catch { /* ignore parse errors */ }
          });
        });

        // Subscribe to private notification queue
        client.subscribe('/user/queue/notification', (msg: IMessage) => {
          try {
            const event: NotificationEvent = JSON.parse(msg.body);
            onNotification?.(event);
          } catch { /* ignore parse errors */ }
        });
      },

      onStompError: (frame) => {
        console.error('[WS] STOMP error:', frame.headers?.message);
        reconnectDelay.current = Math.min(reconnectDelay.current * 2, 30000);
      },

      onDisconnect: () => {
        reconnectDelay.current = Math.min(reconnectDelay.current * 2, 30000);
      },
    });

    clientRef.current = client;
    client.activate();
  }, [accessToken, conversationIds.join(',')]);

  useEffect(() => {
    connect();

    // Presence ping every 20 seconds
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
    clientRef.current?.publish({
      destination: '/app/chat.send',
      body: JSON.stringify(payload),
    });
  }, []);

  const sendReadReceipt = useCallback((payload: ReadReceiptPayload) => {
    clientRef.current?.publish({
      destination: '/app/chat.read',
      body: JSON.stringify(payload),
    });
  }, []);

  return {
    sendMessage,
    sendReadReceipt,
    isConnected: () => clientRef.current?.connected ?? false,
  };
}
