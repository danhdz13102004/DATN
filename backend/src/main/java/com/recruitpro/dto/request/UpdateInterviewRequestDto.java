package com.recruitpro.dto.request;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateInterviewRequestDto {
    private Instant scheduledTime;
    private String meetingType;
    private String meetingLink;
    private String note;
}
