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
public class JobDto {

    private UUID id;
    private UUID companyId;
    private UUID companyAddressId;
    private String title;
    private String description;
    private Industry industry;
    private String[] responsibilities;
    private String[] requirements;
    private String[] niceToHaveSkills;
    private Map<String, Object> jobDataStructure;
    private Set<ExperienceLevel> experienceLevels;
    private String location;
    private Integer salaryMin;
    private Integer salaryMax;
    private JobType jobType;
    private JobStatus status;
    private Set<Skill> skills;
    private Instant createdAt;
    private Instant updatedAt;

    // Attachment (full public URL)
    private String attachmentUrl;

    // Company name for list view (populated from company lookup)
    private String companyName;
    private String logoUrl;

    @JsonProperty("isSaved")
    private boolean isSaved;
}
