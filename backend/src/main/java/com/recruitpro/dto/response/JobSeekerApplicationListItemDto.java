package com.recruitpro.dto.response;

import com.recruitpro.model.enums.ApplicationStatus;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class JobSeekerApplicationListItemDto {
    private UUID id;
    private String jobTitle;
    private UUID jobId;
    private String companyName;
    private String companyInitial;
    private Float aiScore;
    private ApplicationStatus status;
    private Instant appliedAt;
}
