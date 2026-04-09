package com.recruitpro.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "conversations")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Conversation {

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "application_id", nullable = false)
    private UUID applicationId;

    @Column(name = "staff_id", nullable = false)
    private UUID staffId;

    @Column(name = "job_seeker_id", nullable = false)
    private UUID jobSeekerId;

    @Column(name = "is_initiated", nullable = false)
    private boolean isInitiated;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        if (id == null) id = UUID.randomUUID();
        createdAt = Instant.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }

    @Transient
    private Staff staff; // Transient field for convenience

    @Transient
    private JobSeeker jobSeeker; // Transient field for convenience
    
}
