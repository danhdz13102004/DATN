package com.recruitpro.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class JobSeekerDashboardStatsDto {
    private long jobsApplied;
    private long interviewsCount;
    private long upcomingInterviews;
}
