package com.recruitpro.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.Set;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JobSeekerProfileDto {

    // JobSeeker fields
    private UUID id;
    private String avatarUrl;
    private String bio;
    private String location;
    private Integer experienceYears;
    private Set<SkillDto> skills;
    private Instant createdAt;
    private Instant updatedAt;

    // Flattened User fields (avoids serializing the Hibernate proxy)
    private UUID userId;
    private String email;
    private String fullName;
    private String role;
    private String status;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SkillDto {
        private UUID id;
        private String name;
    }
}
