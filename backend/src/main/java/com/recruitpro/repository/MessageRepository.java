package com.recruitpro.repository;

import com.recruitpro.model.Message;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface MessageRepository extends JpaRepository<Message, UUID> {

    Page<Message> findByConversationIdOrderByCreatedAtAsc(UUID conversationId, Pageable pageable);

    Optional<Message> findByIdempotencyKey(String idempotencyKey);

    Optional<Message> findFirstByConversationIdOrderByCreatedAtDesc(UUID conversationId);

    @Query(value = """
        SELECT COUNT(*)
        FROM messages m
        LEFT JOIN message_reads mr
            ON mr.conversation_id = m.conversation_id
           AND mr.user_id = :userId
        LEFT JOIN messages last_read
            ON last_read.id = mr.last_read_message_id
        WHERE m.conversation_id = :conversationId
          AND m.sender_id <> :userId
          AND (
              mr.last_read_message_id IS NULL
              OR m.created_at > last_read.created_at
          )
        """, nativeQuery = true)
    long countUnreadForUser(@Param("conversationId") UUID conversationId,
                            @Param("userId") UUID userId);
}
