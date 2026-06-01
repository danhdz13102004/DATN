package com.recruitpro.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResumeResponse {

    private UUID id;
    private UUID jobSeekerId;
    private String fileUrl;
    private String publicUrl;
    private String label;
    private Long fileSize;
    private Boolean isPrimary;
    private Instant createdAt;
    private Instant updatedAt;
}
