package com.recruitpro.service;

import com.recruitpro.cache.ChatCacheService;
import com.recruitpro.dto.chat.MessageResponseDto;
import com.recruitpro.dto.chat.ReadReceiptEvent;
import com.recruitpro.dto.chat.SendMessageRequest;
import com.recruitpro.model.Message;
import com.recruitpro.model.MessageRead;
import com.recruitpro.model.enums.MessageType;
import com.recruitpro.repository.MessageReadRepository;
import com.recruitpro.repository.MessageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class MessageService {

    private final MessageRepository     messageRepository;
    private final MessageReadRepository messageReadRepository;
    private final ChatCacheService      chatCacheService;

    @Transactional
    public Message saveMessage(UUID conversationId, UUID senderId, SendMessageRequest req) {
        // Atomic idempotency check via Redis SETNX
        String tmpId    = UUID.randomUUID().toString();
        String existing = chatCacheService.acquireIdempotencySlot(req.getIdempotencyKey(), tmpId);
        if (existing != null) {
            log.info("[MSG] Duplicate idempotencyKey={} → returning existing {}", req.getIdempotencyKey(), existing);
            return messageRepository.findById(UUID.fromString(existing))
                    // If the slot was just created then DB might not have it yet — create a dummy return
                    .orElseGet(() -> messageRepository.findByIdempotencyKey(req.getIdempotencyKey()).orElseThrow());
        }

        MessageType type = MessageType.valueOf(req.getType().toUpperCase());

        Message message = Message.builder()
                .conversationId(conversationId)
                .senderId(senderId)
                .content(req.getContent())
                .type(type)
                .fileKey(req.getFileKey())
                .fileName(req.getFileName())
                .fileSizeBytes(req.getFileSizeBytes())
                .idempotencyKey(req.getIdempotencyKey())
                .build();

        Message saved = messageRepository.save(message);

        // Update Redis slot to use actual persisted message ID
        chatCacheService.acquireIdempotencySlot(req.getIdempotencyKey(), saved.getId().toString());

        return saved;
    }

    @Transactional
    public ReadReceiptEvent markAsRead(UUID conversationId, UUID userId, UUID lastReadMessageId) {
        MessageRead read = messageReadRepository
                .findByConversationIdAndUserId(conversationId, userId)
                .orElseGet(() -> MessageRead.builder()
                        .conversationId(conversationId)
                        .userId(userId)
                        .build());
        read.setLastReadMessageId(lastReadMessageId);
        read.setReadAt(Instant.now());
        messageReadRepository.save(read);

        return ReadReceiptEvent.builder()
                .eventType("READ_RECEIPT")
                .conversationId(conversationId)
                .readerId(userId)
                .lastReadMessageId(lastReadMessageId)
                .readAt(read.getReadAt())
                .build();
    }

    @Transactional(readOnly = true)
    public Page<MessageResponseDto> getHistory(UUID conversationId, int page, int size) {
        return messageRepository.findByConversationIdOrderByCreatedAtAsc(
                        conversationId, PageRequest.of(page, Math.min(size, 50)))
                .map(this::toDto);
    }

    public MessageResponseDto toDto(Message m) {
        return MessageResponseDto.builder()
                .id(m.getId())
                .conversationId(m.getConversationId())
                .senderId(m.getSenderId())
                .content(m.getContent())
                .type(m.getType().name())
                .fileName(m.getFileName())
                .fileSizeBytes(m.getFileSizeBytes())
                .createdAt(m.getCreatedAt())
                .build();
    }
}
