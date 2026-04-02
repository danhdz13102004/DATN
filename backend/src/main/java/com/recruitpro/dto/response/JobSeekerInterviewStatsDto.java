package com.recruitpro.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class JobSeekerInterviewStatsDto {
    private long upcoming;
    private long completed;
    private long cancelled;
}
