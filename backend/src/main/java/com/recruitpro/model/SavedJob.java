package com.recruitpro.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(
    name = "saved_jobs",
    uniqueConstraints = @UniqueConstraint(columnNames = {"job_seeker_id", "job_id"})
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SavedJob {

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "job_seeker_id", nullable = false)
    private UUID jobSeekerId;

    @Column(name = "job_id", nullable = false)
    private UUID jobId;

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
}
