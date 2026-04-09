package com.recruitpro.chat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.recruitpro.dto.chat.NotificationEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationRedisSubscriber implements MessageListener {

    private final SimpMessagingTemplate messagingTemplate;
    private final ObjectMapper objectMapper;

    @Override
    public void onMessage(Message message, byte[] pattern) {
        String body = new String(message.getBody());
        try {
            NotificationEvent event = objectMapper.readValue(body, NotificationEvent.class);
            // Spring STOMP routes to the correct WS session via user destination
            messagingTemplate.convertAndSendToUser(
                    event.getUserId().toString(),
                    "/queue/notification",
                    event
            );
            log.debug("[NOTIF-RELAY] notification → user {}", event.getUserId());
        } catch (Exception e) {
            log.error("[NOTIF-RELAY] Failed to relay notification: {}", e.getMessage());
        }
    }
}
