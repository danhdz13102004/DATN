package com.recruitpro.dto.response;

import com.recruitpro.model.enums.InterviewStatus;
import com.recruitpro.model.enums.MeetingType;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class JobSeekerInterviewListItemDto {
    private UUID id;
    private String jobTitle;
    private UUID jobId;
    private String companyName;
    private String companyInitial;
    private Instant scheduledTime;
    private MeetingType meetingType;
    private String meetingLink;
    private InterviewStatus status;
    private String note;
}
