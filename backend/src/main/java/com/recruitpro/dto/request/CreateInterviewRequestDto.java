package com.recruitpro.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateInterviewRequestDto {

    @NotNull(message = "Application ID is required")
    private String applicationId;

    @NotNull(message = "Scheduled time is required")
    private Instant scheduledTime;

    @NotNull(message = "Meeting type is required")
    private String meetingType;

    private String meetingLink;
    private String note;
}
