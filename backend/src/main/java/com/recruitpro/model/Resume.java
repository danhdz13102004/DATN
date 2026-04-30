package com.recruitpro.model;

import com.recruitpro.dto.ResumeDataStructure;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.SQLRestriction;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "resumes")
@SQLRestriction("deleted_at IS NULL")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Resume {

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "job_seeker_id", nullable = false)
    private UUID jobSeekerId;

    @Column(name = "file_url")
    private String fileUrl;

    @Column(name = "parsed_text", columnDefinition = "TEXT")
    private String parsedText;

    @Column(name = "label")
    private String label;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(name = "is_primary", nullable = false)
    @Builder.Default
    private Boolean isPrimary = false;

    // embedding managed by AI service — not mapped in JPA

    /** Structured data extracted from the resume PDF by OpenAI. */
    @Column(name = "resume_data_structure", columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    private ResumeDataStructure resumeDataStructure;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @Column(name = "deleted_at")
    private Instant deletedAt;

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
