package com.recruitpro.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class AdminCompanyDetailDto {

    private UUID id;
    private String name;
    private String description;
    private String website;
    private String logoUrl;
    private boolean verified;
    private Instant createdAt;
    private Instant updatedAt;

    private List<StaffItem> staff;
    private List<JobItem> activeJobs;
    private long totalStaff;
    private long totalActiveJobs;

    @Data
    @Builder
    public static class StaffItem {
        private String id;
        private String userId;
        private String email;
        private String fullName;
        private String role;
        private Instant joinedAt;
    }

    @Data
    @Builder
    public static class JobItem {
        private UUID id;
        private String title;
        private String jobType;
        private List<String> experienceLevels;
        private String status;
        private long applicationCount;
        private Instant createdAt;
    }
}
