package com.recruitpro.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class SavedJobDto {
    private UUID savedJobId;
    private UUID jobId;
    private String jobTitle;
    private String companyName;
    private String location;
    private String jobType;
    private Integer salaryMin;
    private Integer salaryMax;
    private Instant savedAt;
    private boolean isSaved;
}
