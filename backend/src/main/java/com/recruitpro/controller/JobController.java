package com.recruitpro.controller;

import com.recruitpro.dto.response.ApiResponse;
import com.recruitpro.dto.response.JobDetailDto;
import com.recruitpro.dto.response.JobDto;
import com.recruitpro.dto.response.PaginationMeta;
import com.recruitpro.model.enums.ExperienceLevel;
import com.recruitpro.model.enums.JobType;
import com.recruitpro.security.UserPrincipal;
import com.recruitpro.service.JobService;
import com.recruitpro.service.JobSeekerService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * Public job-browsing endpoints (no auth required).
 * When a JOBSEEKER token is present, isSaved is populated per job.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/jobs")
@RequiredArgsConstructor
public class JobController {

    private final JobService jobService;
    private final JobSeekerService jobSeekerService;

    @GetMapping
    public ResponseEntity<ApiResponse<Object>> listPublished(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) JobType jobType,
            @RequestParam(required = false) java.util.Set<ExperienceLevel> experienceLevels,
            @RequestParam(required = false) String location,
            @RequestParam(required = false) Long cityId,
            @RequestParam(required = false) Long countryId,
            @RequestParam(required = false) Double salaryMin,
            @RequestParam(required = false) Double salaryMax,
            @PageableDefault(size = 20) Pageable pageable,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        UUID seekerId = resolveSeekerId(principal);
        Page<JobDto> page = jobService.findPublishedJobDtos(keyword, jobType, experienceLevels, location, salaryMin, salaryMax, cityId, countryId, seekerId, pageable);
        PaginationMeta meta = PaginationMeta.builder()
                .page(page.getNumber() + 1)
                .pageSize(page.getSize())
                .total(page.getTotalElements())
                .build();
        return ResponseEntity.ok(ApiResponse.ok(page.getContent(), meta));
    }

    /**
     * Get job detail by ID with full company information for the job detail page.
     * Returns JobDetailDto which includes company details, responsibilities, requirements, benefits, etc.
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<JobDetailDto>> getById(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        UUID seekerId = resolveSeekerId(principal);
        return ResponseEntity.ok(ApiResponse.ok(jobService.findByIdAsJobDetailDto(id, seekerId)));
    }

    /** Resolves the job seeker entity ID from the JWT principal, or null for guests / non-jobseekers. */
    private UUID resolveSeekerId(UserPrincipal principal) {
        if (principal == null || !"JOBSEEKER".equals(principal.getRole())) {
            return null;
        }
        try {
            return jobSeekerService.findByUserId(UUID.fromString(principal.getId())).getId();
        } catch (Exception e) {
            log.debug("Could not resolve seeker for user {}: {}", principal.getId(), e.getMessage());
            return null;
        }
    }
}

