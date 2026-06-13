package com.recruitpro.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.recruitpro.model.Industry;
import com.recruitpro.model.Skill;
import com.recruitpro.model.enums.ExperienceLevel;
import com.recruitpro.model.enums.JobStatus;
import com.recruitpro.model.enums.JobType;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Data
@Builder
public class JobDetailDto {

    // ============================================================
    // Job Core Fields
    // ============================================================
    private UUID id;
    private UUID companyId;
    private UUID companyAddressId;
    private String title;
    private String description;

    // ============================================================
    // Industry
    // ============================================================
    private Industry industry;

    // ============================================================
    // Detailed Sections
    // ============================================================
    private String[] responsibilities;
    private String[] requirements;
    private String[] niceToHaveSkills;
    private String[] benefits;
    private Map<String, Object> jobDataStructure;
    private Set<ExperienceLevel> experienceLevels;

    // ============================================================
    // Location & Compensation
    // ============================================================
    private String location;
    private String addressDetail;
    private Integer salaryMin;
    private Integer salaryMax;
    private String salaryCurrency;

    // ============================================================
    // Job Metadata
    // ============================================================
    private JobType jobType;
    private JobStatus status;
    private Set<Skill> skills;
    private Instant createdAt;
    private Instant updatedAt;

    // ============================================================
    // Attachment
    // ============================================================
    private String attachmentUrl;

    // ============================================================
    // Save Status (populated for authenticated job seekers)
    // ============================================================
    @JsonProperty("isSaved")
    private boolean isSaved;

    // ============================================================
    // Company Information (eager-loaded for detail page)
    // ============================================================
    private CompanyDetailDto company;

    // ============================================================
    // Nested DTOs
    // ============================================================
    @Data
    @Builder
    public static class CompanyDetailDto {
        private UUID id;
        private String name;
        private String description;
        private String website;
        private String logoUrl;
        private boolean verified;
        private String location;
        private String industry;
        private Long staffCount;
        private Instant foundedAt;
        private String benefits;
        private long activeJobsCount;
    }
}
