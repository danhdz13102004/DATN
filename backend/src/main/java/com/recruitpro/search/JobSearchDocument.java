package com.recruitpro.search;

import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JobSearchDocument {

    private UUID jobId;
    private UUID companyId;
    private String companyName;
    private String jobType;
    private List<String> experienceLevels;
    private Long cityId;
    private Long countryId;
    private Integer salaryMin;
    private Integer salaryMax;
    private String status;
    private String closeDate;
    private Long createdAt;
    private Long updatedAt;

    private String title;
    private List<String> skills;
    private String industryName;
    private String description;
    private List<String> requirements;
    private List<String> responsibilities;
    private List<String> niceToHaveSkills;
    private String location;
}
