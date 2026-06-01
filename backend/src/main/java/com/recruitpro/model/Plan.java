package com.recruitpro.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "plans")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Plan {

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal price;

    @Column(name = "job_post_limit", nullable = false)
    private int jobPostLimit;

    @Column(name = "duration_days", nullable = false)
    private int durationDays;

    @Column(name = "allow_use_ai_matching", nullable = false)
    private boolean allowUseAiMatching;

    /**
     * Max AI auto-fill uses per subscription period.
     * 0 means unlimited.
     */
    @Column(name = "auto_fill_limit", nullable = false)
    private int autoFillLimit;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = Instant.now();
    }
}
