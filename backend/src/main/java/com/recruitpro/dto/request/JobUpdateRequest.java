package com.recruitpro.dto.request;

import com.recruitpro.model.enums.ExperienceLevel;
import com.recruitpro.model.enums.JobStatus;
import com.recruitpro.model.enums.JobType;

import java.util.Set;
import java.util.UUID;
import java.time.LocalDate;

public record JobUpdateRequest(
        String title,
        String description,
        String industryId,
        String[] responsibilities,
        String[] requirements,
        String[] niceToHaveSkills,
        String location,
        String addressId,
        Integer salaryMin,
        Integer salaryMax,
        JobType jobType,
        Set<ExperienceLevel> levels,
        Set<UUID> skillIds,
        JobStatus status,
        LocalDate closeDate
) {}
