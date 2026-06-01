package com.recruitpro.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Structured job posting data extracted from a file via OCR + OpenAI.
 * Returned by the {@code POST /company/jobs/auto-fill} endpoint.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JobAutoFillDto {
    @JsonProperty("job_title")
    private String jobTitle;

    private String description;

    @JsonProperty("job_type")
    private String jobType;               // FULLTIME | PARTTIME | REMOTE | HYBRID

    @JsonProperty("experience_levels")
    private List<String> experienceLevels; // INTERN | FRESHER | JUNIOR | MIDDLE | SENIOR | LEADER

    private String location;

    @JsonProperty("salary_min")
    private Integer salaryMin;

    @JsonProperty("salary_max")
    private Integer salaryMax;

    private String industry;

    private List<String> responsibilities;

    private List<String> requirements;

    @JsonProperty("must_have_skills")
    private List<String> mustHaveSkills;

    @JsonProperty("nice_to_have_skills")
    private List<String> niceToHaveSkills;
}
