package com.recruitpro.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Detailed AI matching result stored in {@code application.json_matching}.
 * Each field represents the cosine similarity (or exact-match) score for a
 * particular feature pair between the resume and the job description.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class AiMatchingResult {

    @JsonProperty("overall_score")
    private Float overallScore;

    private Float skills;

    private Float experience;

    private Float seniority;

    private Float industry;

    @JsonProperty("nice_to_have_skills")
    private Float niceToHaveSkills;
}
