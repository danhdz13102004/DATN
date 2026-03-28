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
public class RecentApplicationDto {
    private String id;
    private String candidateName;
    private String candidateEmail;
    private String jobTitle;
    private Float aiScore;
    private String status;
    private Instant appliedAt;
}
