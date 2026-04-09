package com.recruitpro.dto.chat;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/** Broadcast event published to /topic/chat.{conversationId} */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessageEvent {
    private String             eventType;   // "CHAT_MESSAGE"
    private UUID               conversationId;
    private MessageResponseDto message;
}
