package com.recruitpro.dto.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonAlias;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class ApplicationCompareResponseDto {

    @JsonAlias("overall_score")
    private Integer overallScore;

    private String verdict;

    private String summary;

    private List<String> strengths;

    private List<String> gaps;

    private List<String> suggestions;

    @JsonAlias("matched_skills")
    private List<String> matchedSkills;

    @JsonAlias("missing_skills")
    private List<String> missingSkills;
}
