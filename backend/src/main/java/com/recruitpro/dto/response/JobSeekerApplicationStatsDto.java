package com.recruitpro.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class JobSeekerApplicationStatsDto {
    private long totalApplied;
    private long inScreening;
    private long inInterview;
    private long offers;
}
