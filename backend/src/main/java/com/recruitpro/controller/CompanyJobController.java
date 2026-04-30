package com.recruitpro.controller;

import com.recruitpro.dto.response.ApiResponse;
import com.recruitpro.dto.response.JobSelectOptionDto;
import com.recruitpro.dto.response.PaginationMeta;
import com.recruitpro.model.Industry;
import com.recruitpro.model.Job;
import com.recruitpro.model.enums.ExperienceLevel;
import com.recruitpro.model.enums.JobStatus;
import com.recruitpro.model.enums.JobType;
import com.recruitpro.repository.IndustryRepository;
import com.recruitpro.security.UserPrincipal;
import com.recruitpro.service.JobService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Company-scoped job management endpoints under /api/v1/company/jobs.
 */
@RestController
@RequestMapping("/api/v1/company/jobs")
@PreAuthorize("hasRole('COMPANY')")
@RequiredArgsConstructor
public class CompanyJobController {

    private final JobService jobService;
    private final IndustryRepository industryRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<Object>> listCompanyJobs(
            @AuthenticationPrincipal UserPrincipal principal,
            @PageableDefault(size = 20) Pageable pageable
    ) {
        UUID companyId = UUID.fromString(principal.getCompanyId());
        Page<Job> page = jobService.findByCompanyId(companyId, pageable);
        PaginationMeta meta = PaginationMeta.builder()
                .page(page.getNumber() + 1)
                .pageSize(page.getSize())
                .total(page.getTotalElements())
                .build();
        return ResponseEntity.ok(ApiResponse.ok(page.getContent(), meta));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Job>> create(
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        // Parse status — default to DRAFT if not provided
        JobStatus status = body.get("status") != null
                ? JobStatus.valueOf((String) body.get("status"))
                : JobStatus.DRAFT;

        Industry industry = resolveIndustry(body);
        Job job = Job.builder()
                .title((String) body.get("title"))
                .description((String) body.get("description"))
                .industry(industry)
                .responsibilities(getStringArray(body, "responsibilities"))
                .requirements(getStringArray(body, "requirements"))
                .niceToHaveSkills(getStringArray(body, "niceToHaveSkills"))
                .location((String) body.get("location"))
                .salaryMin(body.get("salaryMin") != null ? (Integer) body.get("salaryMin") : null)
                .salaryMax(body.get("salaryMax") != null ? (Integer) body.get("salaryMax") : null)
                .jobType(body.get("jobType") != null ? JobType.valueOf((String) body.get("jobType")) : null)
                .status(status)
                .build();

        @SuppressWarnings("unchecked")
        Set<ExperienceLevel> levels = body.get("levels") != null
                ? ((List<String>) body.get("levels")).stream()
                        .map(ExperienceLevel::valueOf)
                        .collect(java.util.stream.Collectors.toSet())
                : Set.of();
        job.setExperienceLevels(levels);

        @SuppressWarnings("unchecked")
        Set<UUID> skillIds = body.get("skillIds") != null ? Set.copyOf(
                ((List<String>) body.get("skillIds")).stream().map(UUID::fromString).toList()
        ) : null;

        Job created = jobService.create(job, skillIds, principal);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(created));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Job>> update(
            @PathVariable UUID id,
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Industry industry = resolveIndustry(body);
        Job updates = Job.builder()
                .title((String) body.get("title"))
                .description((String) body.get("description"))
                .industry(industry)
                .responsibilities(getStringArray(body, "responsibilities"))
                .requirements(getStringArray(body, "requirements"))
                .niceToHaveSkills(getStringArray(body, "niceToHaveSkills"))
                .location((String) body.get("location"))
                .salaryMin(body.get("salaryMin") != null ? (Integer) body.get("salaryMin") : null)
                .salaryMax(body.get("salaryMax") != null ? (Integer) body.get("salaryMax") : null)
                .jobType(body.get("jobType") != null ? JobType.valueOf((String) body.get("jobType")) : null)
                .status(body.get("status") != null ? JobStatus.valueOf((String) body.get("status")) : null)
                .build();

        @SuppressWarnings("unchecked")
        Set<ExperienceLevel> levels = body.get("levels") != null
                ? ((List<String>) body.get("levels")).stream()
                        .map(ExperienceLevel::valueOf)
                        .collect(java.util.stream.Collectors.toSet())
                : null;
        if (levels != null) updates.setExperienceLevels(levels);

        @SuppressWarnings("unchecked")
        Set<UUID> skillIds = body.get("skillIds") != null ? Set.copyOf(
                ((List<String>) body.get("skillIds")).stream().map(UUID::fromString).toList()
        ) : null;

        return ResponseEntity.ok(ApiResponse.ok(jobService.update(id, updates, skillIds, principal)));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<Job>> changeStatus(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        JobStatus status = JobStatus.valueOf(body.get("status"));
        return ResponseEntity.ok(ApiResponse.ok(jobService.changeStatus(id, status, principal)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Map<String, String>>> delete(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        jobService.delete(id, principal);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("message", "Job deleted")));
    }

    @GetMapping("/select-options")
    public ResponseEntity<ApiResponse<List<JobSelectOptionDto>>> getSelectOptions(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        UUID companyId = UUID.fromString(principal.getCompanyId());
        return ResponseEntity.ok(ApiResponse.ok(jobService.getSelectOptions(companyId)));
    }

    @SuppressWarnings("unchecked")
    private String[] getStringArray(Map<String, Object> body, String key) {
        Object val = body.get(key);
        if (val == null) return null;
        return ((List<String>) val).toArray(new String[0]);
    }

    private Industry resolveIndustry(Map<String, Object> body) {
        Object raw = body.get("industryId");
        if (raw == null) return null;
        UUID industryId = UUID.fromString((String) raw);
        return industryRepository.findById(industryId).orElse(null);
    }
}
