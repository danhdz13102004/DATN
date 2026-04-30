# RecruitPro — WebSocket & Realtime Event Flow

## Overview

RecruitPro uses **STOMP over native WebSocket** (Spring Boot on the backend, `@stomp/stompjs` on the frontend) combined with **Redis Pub/Sub** as a message broker bus — enabling realtime chat and push notifications across multiple server instances.

---

## Architecture Diagram

```
┌───────────────────────────────────────────────────────────────────────┐
│                          FRONTEND (React)                             │
│                                                                       │
│  useRecruitProWebSocket (useWebSocket.ts)                             │
│   └── @stomp/stompjs Client                                           │
│         ├── WS connect  →  ws://backend/ws-native                    │
│         ├── SUBSCRIBE   →  /topic/chat.{convId}                      │
│         ├── SUBSCRIBE   →  /user/queue/notification                  │
│         ├── PUBLISH     →  /app/chat.send                            │
│         ├── PUBLISH     →  /app/chat.read                            │
│         └── PUBLISH     →  /app/presence.ping  (every 20 s)         │
└────────────────────────────┬──────────────────────────────────────────┘
                             │ STOMP over WebSocket (RFC 6455)
┌────────────────────────────▼──────────────────────────────────────────┐
│                    BACKEND (Spring Boot)                               │
│                                                                       │
│  WebSocketConfig (/ws-native endpoint, /ws SockJS fallback)          │
│  JwtChannelInterceptor — validates JWT on CONNECT & SUBSCRIBE        │
│                                                                       │
│  ChatMessageHandler (@MessageMapping)                                 │
│   ├── /app/chat.send   → save msg → Redis PUBLISH chat channel       │
│   ├── /app/chat.read   → mark read → Redis PUBLISH read-receipt      │
│   └── /app/presence.ping → update online TTL in Redis                │
│                                                                       │
│  RedisPublisher → StringRedisTemplate.convertAndSend()               │
│                                                                       │
│  NotificationService.createAndPublish()                               │
│   └── persist Notification → Redis PUBLISH notification channel      │
│                                                                       │
│  ─── Redis Pub/Sub Listener ──────────────────────────────────────── │
│  ChatRedisSubscriber        (redis:channel:chat:* / read-receipt:*)  │
│   └── messagingTemplate.convertAndSend(/topic/chat.{convId}, event) │
│                                                                       │
│  NotificationRedisSubscriber (redis:channel:notification:*)          │
│   └── messagingTemplate.convertAndSendToUser(userId,                 │
│             /queue/notification, event)                               │
└────────────────────────────┬──────────────────────────────────────────┘
                             │
              ┌──────────────▼──────────────┐
              │        Redis Pub/Sub         │
              │  redis:channel:chat:{id}     │
              │  redis:channel:read-receipt  │
              │  redis:channel:notification  │
              └─────────────────────────────┘
```

---

## Phase 1 — Connection & Authentication

### 1.1 Frontend initiates connection

**File:** `frontend-jobseeker/src/hooks/useWebSocket.ts`

```ts
const client = new Client({
  webSocketFactory: () => new WebSocket(getWsUrl()),  // ws://backend/ws-native
  connectHeaders: { Authorization: `Bearer ${accessToken}` },
  reconnectDelay: 2000,
  heartbeatIncoming: 25000,
  heartbeatOutgoing: 10000,
  ...
});
client.activate();
```

- The hook reads `accessToken` from `authStore` and builds the WebSocket URL from `VITE_API_URL`.
- A `STOMP CONNECT` frame is sent with `Authorization: Bearer <JWT>` in the headers.

### 1.2 Backend validates JWT (CONNECT phase)

**File:** `backend/.../chat/JwtChannelInterceptor.java`

On every inbound STOMP frame, `JwtChannelInterceptor.preSend()` runs:

1. If the command is **CONNECT** → extract the `Authorization` header, parse and validate the JWT via `JwtUtil`.
2. If valid → a `UsernamePasswordAuthenticationToken` is attached to the STOMP session (`accessor.setUser(auth)`). The principal `name` is the **user UUID**.
3. If the token is missing or invalid → `MessageDeliveryException` is thrown, rejecting the connection.

### 1.3 Backend endpoint configuration

**File:** `backend/.../config/WebSocketConfig.java`

```java
registry.addEndpoint("/ws-native")           // native WebSocket (frontend uses this)
    .setAllowedOriginPatterns(originPatterns);

registry.addEndpoint("/ws")                  // SockJS fallback
    .setAllowedOriginPatterns(originPatterns)
    .withSockJS();

config.enableSimpleBroker("/topic", "/queue");
config.setApplicationDestinationPrefixes("/app");
config.setUserDestinationPrefix("/user");
```

---

## Phase 2 — Subscription

### 2.1 Chat topic subscription

After `onConnect` fires on the frontend:

```ts
client.subscribe(`/topic/chat.${convId}`, (msg) => { ... });
```

On the backend, when this `SUBSCRIBE` frame arrives, `JwtChannelInterceptor` checks:
- If the destination is `/topic/chat.*` → calls `conversationService.assertParticipant(convId, userId)` to confirm the authenticated user is a member of that conversation.
- If the check fails → the subscription is rejected.

### 2.2 Notification queue subscription

```ts
client.subscribe('/user/queue/notification', (msg) => { ... });
```

Spring STOMP translates this to a user-scoped destination: `/user/{userId}/queue/notification`, so each session only receives its own notifications.

---

## Phase 3 — Sending a Chat Message

```
Frontend                      Backend                     Redis
   │                             │                           │
   │── STOMP /app/chat.send ────▶│                           │
   │   { conversationId,         │                           │
   │     content, type,          │ 1. Validate participation │
   │     idempotencyKey }        │ 2. Save Message to DB     │
   │                             │ 3. Mark conv as initiated │
   │                             │ 4. Build MessageResponseDto│
   │                             │── PUBLISH ───────────────▶│
   │                             │   redis:channel:chat:{id} │
   │                             │                           │
   │                             │ 5. Resolve recipient user │
   │                             │ 6. Persist Notification   │
   │                             │── PUBLISH ───────────────▶│
   │                             │   redis:channel:          │
   │                             │   notification:{userId}   │
```

**File:** `backend/.../chat/ChatMessageHandler.java` → `@MessageMapping("/chat.send")`

1. The sender's UUID is extracted from `principal.getName()`.
2. **Initiation guard**: if the conversation has not been initiated yet, only `COMPANY` role (staff) can send the first message.
3. **Participation guard**: once initiated, validates the sender is either the conversation's staff or job seeker.
4. The message is persisted via `MessageService.saveMessage()`.
5. A `ChatMessageEvent` (type `CHAT_MESSAGE`) is published to `redis:channel:chat:{conversationId}`.
6. A notification is created and published for the **recipient** via `NotificationService.createAndPublish()`.

### Optimistic UI (Frontend)

Before the server echo arrives, the frontend appends an optimistic message using a `uuidv4()` as a temporary ID:

```ts
const optimistic: Message = { id: idempotencyKey, ... };
setMessages((prev) => [...prev, optimistic]);
sendMessage({ conversationId, content, type: 'TEXT', idempotencyKey });
```

When the server echo comes back through the WebSocket, the handler replaces the optimistic entry by matching on `idempotencyKey`, message ID, or time + content proximity.

---

## Phase 4 — Receiving a Chat Message (Redis Relay)

```
Redis                        Backend                       Frontend
  │                             │                              │
  │── SUBSCRIBE ───────────────▶│ ChatRedisSubscriber          │
  │   redis:channel:chat:*      │ .onMessage()                 │
  │                             │                              │
  │                             │── STOMP /topic/chat.{id} ──▶│
  │                             │   ChatMessageEvent           │ onChatEvent()
  │                             │                              │ → dedup & append msg
  │                             │                              │ → auto sendReadReceipt
```

**File:** `backend/.../chat/ChatRedisSubscriber.java`

```java
messagingTemplate.convertAndSend("/topic/chat." + event.getConversationId(), event);
```

- `RedisPubSubConfig` registers `ChatRedisSubscriber` to listen on both:
  - `redis:channel:chat:*` (new messages)
  - `redis:channel:read-receipt:*` (read acknowledgements)
- Both event types are fanned out on the same STOMP topic `/topic/chat.{convId}`.

### Frontend handler (ChatListPage / ChatRoomPage)

```ts
const handleChatEvent = (event: ChatEvent) => {
  if (event.eventType === 'CHAT_MESSAGE' && event.conversationId === activeId) {
    setMessages((prev) => { /* dedup + replace optimistic */ });
    sendReadReceipt({ conversationId, lastReadMessageId: event.message.id });
  }
  // Always update sidebar conversation preview
  setConversations((prev) => prev.map((c) =>
    c.id === event.conversationId
      ? { ...c, lastMessage: event.message.content, lastMessageAt: event.message.createdAt }
      : c
  ));
};
```

---

## Phase 5 — Read Receipts

```
Frontend                      Backend                      Redis
   │── STOMP /app/chat.read ─▶ │                             │
   │   { conversationId,        │ MessageService.markAsRead() │
   │     lastReadMessageId }    │── PUBLISH ─────────────────▶│
   │                            │   redis:channel:read-receipt│
   │                            │                             │
   │                ◀── STOMP /topic/chat.{id} ──────────────│
   │                    ReadReceiptEvent                      │
```

**File:** `ChatMessageHandler.java` → `@MessageMapping("/chat.read")`

- Marks messages as read in the database.
- Publishes a `ReadReceiptEvent` to `redis:channel:read-receipt:{conversationId}`.
- `ChatRedisSubscriber` relays it to `/topic/chat.{convId}`.

---

## Phase 6 — Push Notifications

```
Redis                        Backend                       Frontend
  │                             │                              │
  │── SUBSCRIBE ───────────────▶│ NotificationRedisSubscriber  │
  │  redis:channel:notification:│ .onMessage()                 │
  │  {userId}                   │                              │
  │                             │── STOMP ────────────────────▶│
  │                             │  /user/{userId}/queue/       │ onNotification()
  │                             │  notification                │ → update unreadCount
```

**File:** `backend/.../chat/NotificationRedisSubscriber.java`

```java
messagingTemplate.convertAndSendToUser(
    event.getUserId().toString(),
    "/queue/notification",
    event
);
```

- `convertAndSendToUser` routes to the user-specific STOMP session — no other user receives it.
- The `NotificationEvent` payload includes `unreadCount` (fetched from DB before publishing).

### Frontend handler

```ts
const handleNotification = (e: NotificationEvent) => {
  if (e.notification.type === 'MESSAGE') {
    setConversations((prev) => prev.map((c) =>
      c.id === e.notification.referenceId
        ? { ...c, unreadCount: c.id === activeId ? 0 : c.unreadCount + 1 }
        : c
    ));
  }
};
```

---

## Phase 7 — Presence Ping

```ts
const presencePing = setInterval(() => {
  if (clientRef.current?.connected) {
    clientRef.current.publish({ destination: '/app/presence.ping', body: '' });
  }
}, 20000);  // every 20 seconds
```

**File:** `ChatMessageHandler.java` → `@MessageMapping("/presence.ping")`

- Calls `chatCacheService.setUserOnline(userId)` which sets a Redis key `presence:{userId}` with a **30-second TTL**.
- If no ping arrives within 30 s, the key expires and the user is considered offline.
- `ChatCacheService.isUserOnline(userId)` can be queried by other services to check online status.

---

## Phase 8 — Reconnection & Heartbeat

| Setting | Value |
|---|---|
| Initial reconnect delay | 2 000 ms |
| Max reconnect delay | 30 000 ms (exponential back-off on `onStompError`) |
| Heartbeat outgoing (client → server) | 10 000 ms |
| Heartbeat incoming (server → client) | 25 000 ms |

On reconnect, `useEffect` re-runs `connect()` which re-subscribes to all `conversationIds` passed in at that moment.

---

## Redis Channel Summary

| Redis Channel Pattern | Publisher | Subscriber | STOMP Destination |
|---|---|---|---|
| `redis:channel:chat:{convId}` | `ChatMessageHandler` | `ChatRedisSubscriber` | `/topic/chat.{convId}` |
| `redis:channel:read-receipt:{convId}` | `ChatMessageHandler` | `ChatRedisSubscriber` | `/topic/chat.{convId}` |
| `redis:channel:notification:{userId}` | `NotificationService` | `NotificationRedisSubscriber` | `/user/{userId}/queue/notification` |

---

## Event Type Reference

### `ChatMessageEvent` (eventType: `"CHAT_MESSAGE"`)
```json
{
  "eventType": "CHAT_MESSAGE",
  "conversationId": "uuid",
  "message": {
    "id": "uuid",
    "conversationId": "uuid",
    "senderId": "uuid",
    "senderName": "John Doe",
    "senderRole": "STAFF | JOBSEEKER",
    "content": "Hello!",
    "type": "TEXT | FILE",
    "fileName": null,
    "fileUrl": null,
    "isRead": false,
    "createdAt": "ISO-8601"
  }
}
```

### `ReadReceiptEvent` (eventType: `"READ_RECEIPT"`)
```json
{
  "eventType": "READ_RECEIPT",
  "conversationId": "uuid",
  "readerId": "uuid",
  "lastReadMessageId": "uuid"
}
```

### `NotificationEvent` (eventType: `"NOTIFICATION"`)
```json
{
  "eventType": "NOTIFICATION",
  "userId": "uuid",
  "unreadCount": 3,
  "notification": {
    "id": "uuid",
    "type": "MESSAGE",
    "title": "New message from ...",
    "content": "...",
    "isRead": false,
    "referenceId": "uuid",
    "referenceType": "message",
    "createdAt": "ISO-8601"
  }
}
```

---

## Security Controls

| Control | Where | What it does |
|---|---|---|
| JWT on CONNECT | `JwtChannelInterceptor` | Rejects unauthenticated WS sessions |
| Participant check on SUBSCRIBE | `JwtChannelInterceptor` | Prevents subscribing to another user's chat topic |
| Participant check on SEND | `ChatMessageHandler` | Prevents non-participants from posting |
| Company-only initiation | `ChatMessageHandler` | Only staff can send the first message in a conversation |
| User-scoped notification channel | `convertAndSendToUser` | Notifications are never broadcast; always per-user |
| Presence TTL | `ChatCacheService` (30 s) | No server-side session leak; presence auto-expires |
