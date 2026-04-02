package com.recruitpro.dto.response;

import com.recruitpro.model.enums.ApplicationStatus;
import com.recruitpro.model.enums.InterviewStatus;
import com.recruitpro.model.enums.MeetingType;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Data
@Builder
public class JobSeekerApplicationDetailDto {
    private UUID id;
    private ApplicationStatus status;
    private Float aiScore;
    private String coverLetter;
    private Instant appliedAt;

    // Job info
    private UUID jobId;
    private String jobTitle;
    private String companyName;
    private String companyInitial;
    private String location;
    private String jobType;
    private Integer salaryMin;
    private Integer salaryMax;
    private Set<String> experienceLevels;
    private Set<String> skills;

    // Resume info
    private UUID resumeId;
    private String resumeLabel;

    // Interview info (nullable – only present if interview is scheduled)
    private UUID interviewId;
    private Instant interviewScheduledTime;
    private MeetingType interviewMeetingType;
    private String interviewMeetingLink;
    private InterviewStatus interviewStatus;
    private String interviewNote;

    // Application history
    private List<HistoryEntry> history;

    @Data
    @Builder
    public static class HistoryEntry {
        private Instant date;
        private String event;
        private String details;
    }
}
