package com.recruitpro.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApplicationDetailResponseDto {
    private String id;
    private String candidateName;
    private String candidateEmail;
    private String candidateAvatar;
    private String candidateLocation;
    private Integer candidateExperienceYears;
    private String candidateBio;
    private String jobId;
    private String jobTitle;
    private Float aiScore;
    private String status;
    private boolean hasScheduledInterview;
    private String resumeUrl;
    private Instant appliedAt;
    private List<TimelineEventDto> timeline;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TimelineEventDto {
        private String type;
        private String description;
        private Instant timestamp;
    }
}
