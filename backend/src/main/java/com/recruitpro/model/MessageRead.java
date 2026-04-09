package com.recruitpro.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "message_reads")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MessageRead {

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "conversation_id", nullable = false)
    private UUID conversationId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "last_read_message_id", nullable = false)
    private UUID lastReadMessageId;

    @Column(name = "read_at", nullable = false)
    private Instant readAt;

    @PrePersist
    protected void onCreate() {
        if (id == null) id = UUID.randomUUID();
        if (readAt == null) readAt = Instant.now();
    }
}
