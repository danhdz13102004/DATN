package com.recruitpro.repository;

import com.recruitpro.model.MessageRead;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface MessageReadRepository extends JpaRepository<MessageRead, UUID> {

    Optional<MessageRead> findByConversationIdAndUserId(UUID conversationId, UUID userId);
}
