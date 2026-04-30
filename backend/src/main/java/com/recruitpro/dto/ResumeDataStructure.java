package com.recruitpro.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Structured resume data extracted by OpenAI and stored in the
 * {@code resume_data_structure} JSONB column of the {@code resumes} table.
 *
 * <p>Field names intentionally match the ML feature columns used in the
 * recommendation model:
 * <pre>
 *   role, seniority, years_experience, industry,
 *   skills, summary, experience_bullets
 * </pre>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class ResumeDataStructure {

    /** Primary job title / role (e.g. "Software Engineer", "Data Scientist"). */
    private String role;

    /** Career level (e.g. "Junior", "Mid-level", "Senior", "Lead", "Manager"). */
    private String seniority;

    /** Total years of professional experience as an integer. */
    @JsonProperty("years_experience")
    private Integer yearsExperience;

    /** Industry domain (e.g. "Technology", "Finance", "Healthcare"). */
    private String industry;

    /**
     * Comma-separated list of technical and soft skills
     * (e.g. "Java, Spring Boot, React, SQL").
     */
    private String skills;

    /** Two-to-four sentence professional summary. */
    private String summary;

    /**
     * Key bullet points from work experience sections, joined by "; ".
     * Each bullet should describe a concrete achievement or responsibility.
     */
    @JsonProperty("experience_bullets")
    private String experienceBullets;
}
