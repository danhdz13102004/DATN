package com.recruitpro.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InterviewResponseDto {
    private String id;
    private String applicationId;
    private String candidateName;
    private String candidateEmail;
    private String candidateAvatar;
    private String jobTitle;
    private Instant scheduledTime;
    private String meetingType;
    private String meetingLink;
    private String status;
    private String note;
    private String interviewerName;
    private Instant createdAt;
}
