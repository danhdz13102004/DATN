package com.recruitpro.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class CompanyResponseDto {
    private UUID id;
    private String name;
    private String description;
    private String website;
    private String logoUrl;
    private boolean verified;
    private boolean blocked;
    private Instant createdAt;
    private long staffCount;
    private long activeJobsCount;
}
