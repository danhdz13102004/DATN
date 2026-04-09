package com.recruitpro.chat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.recruitpro.dto.chat.ChatMessageEvent;
import com.recruitpro.dto.chat.ReadReceiptEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class ChatRedisSubscriber implements MessageListener {

    private final SimpMessagingTemplate messagingTemplate;
    private final ObjectMapper objectMapper;

    @Override
    public void onMessage(Message message, byte[] pattern) {
        String channel = new String(message.getChannel());
        String body    = new String(message.getBody());

        try {
            if (channel.startsWith("redis:channel:chat:")) {
                ChatMessageEvent event = objectMapper.readValue(body, ChatMessageEvent.class);
                messagingTemplate.convertAndSend(
                        "/topic/chat." + event.getConversationId(), event);
                log.debug("[WS-RELAY] chat msg {} → /topic/chat.{}", event.getMessage().getId(), event.getConversationId());

            } else if (channel.startsWith("redis:channel:read-receipt:")) {
                ReadReceiptEvent event = objectMapper.readValue(body, ReadReceiptEvent.class);
                messagingTemplate.convertAndSend(
                        "/topic/chat." + event.getConversationId(), event);
            }
        } catch (Exception e) {
            log.error("[WS-RELAY] Failed to relay message from channel {}: {}", channel, e.getMessage());
        }
    }
}
