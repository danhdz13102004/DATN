package com.recruitpro.dto.chat;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

/** Broadcast event when a user reads messages in a conversation */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReadReceiptEvent {
    private String  eventType;          // "READ_RECEIPT"
    private UUID    conversationId;
    private UUID    readerId;
    private UUID    lastReadMessageId;
    private Instant readAt;
}
