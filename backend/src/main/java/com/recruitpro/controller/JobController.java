package com.recruitpro.controller;

import com.recruitpro.dto.response.ApiResponse;
import com.recruitpro.dto.response.PaginationMeta;
import com.recruitpro.model.Job;
import com.recruitpro.model.enums.ExperienceLevel;
import com.recruitpro.model.enums.JobStatus;
import com.recruitpro.model.enums.JobType;
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

import java.util.Map;
import java.util.Set;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class JobController {

    private final JobService jobService;

    // ── Public endpoints ─────────────────────────

    @GetMapping("/api/v1/jobs")
    public ResponseEntity<ApiResponse<Object>> listPublished(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) JobType jobType,
            @RequestParam(required = false) ExperienceLevel experienceLevel,
            @RequestParam(required = false) String location,
            @PageableDefault(size = 20) Pageable pageable
    ) {
        Page<Job> page = jobService.findPublishedJobs(keyword, jobType, experienceLevel, location, pageable);
        PaginationMeta meta = PaginationMeta.builder()
                .page(page.getNumber() + 1)
                .pageSize(page.getSize())
                .total(page.getTotalElements())
                .build();
        return ResponseEntity.ok(ApiResponse.ok(page.getContent(), meta));
    }

    @GetMapping("/api/v1/jobs/{id}")
    public ResponseEntity<ApiResponse<Job>> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(jobService.findById(id)));
    }

    // ── Company endpoints ────────────────────────

    @GetMapping("/api/v1/company/jobs")
    @PreAuthorize("hasRole('COMPANY')")
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

    @PostMapping("/api/v1/jobs")
    @PreAuthorize("hasRole('COMPANY')")
    public ResponseEntity<ApiResponse<Job>> create(
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Job job = Job.builder()
                .title((String) body.get("title"))
                .description((String) body.get("description"))
                .location((String) body.get("location"))
                .salaryMin(body.get("salaryMin") != null ? (Integer) body.get("salaryMin") : null)
                .salaryMax(body.get("salaryMax") != null ? (Integer) body.get("salaryMax") : null)
                .jobType(body.get("jobType") != null ? JobType.valueOf((String) body.get("jobType")) : null)
                .experienceLevel(body.get("experienceLevel") != null
                        ? ExperienceLevel.valueOf((String) body.get("experienceLevel")) : null)
                .build();

        @SuppressWarnings("unchecked")
        Set<UUID> skillIds = body.get("skillIds") != null ? Set.copyOf(
                ((java.util.List<String>) body.get("skillIds")).stream().map(UUID::fromString).toList()
        ) : null;

        Job created = jobService.create(job, skillIds, principal);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(created));
    }

    @PutMapping("/api/v1/jobs/{id}")
    @PreAuthorize("hasRole('COMPANY')")
    public ResponseEntity<ApiResponse<Job>> update(
            @PathVariable UUID id,
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Job updates = Job.builder()
                .title((String) body.get("title"))
                .description((String) body.get("description"))
                .location((String) body.get("location"))
                .salaryMin(body.get("salaryMin") != null ? (Integer) body.get("salaryMin") : null)
                .salaryMax(body.get("salaryMax") != null ? (Integer) body.get("salaryMax") : null)
                .jobType(body.get("jobType") != null ? JobType.valueOf((String) body.get("jobType")) : null)
                .experienceLevel(body.get("experienceLevel") != null
                        ? ExperienceLevel.valueOf((String) body.get("experienceLevel")) : null)
                .build();

        @SuppressWarnings("unchecked")
        Set<UUID> skillIds = body.get("skillIds") != null ? Set.copyOf(
                ((java.util.List<String>) body.get("skillIds")).stream().map(UUID::fromString).toList()
        ) : null;

        return ResponseEntity.ok(ApiResponse.ok(jobService.update(id, updates, skillIds, principal)));
    }

    @PatchMapping("/api/v1/jobs/{id}/status")
    @PreAuthorize("hasRole('COMPANY')")
    public ResponseEntity<ApiResponse<Job>> changeStatus(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        JobStatus status = JobStatus.valueOf(body.get("status"));
        return ResponseEntity.ok(ApiResponse.ok(jobService.changeStatus(id, status, principal)));
    }

    @DeleteMapping("/api/v1/jobs/{id}")
    @PreAuthorize("hasRole('COMPANY')")
    public ResponseEntity<ApiResponse<Map<String, String>>> delete(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        jobService.delete(id, principal);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("message", "Job deleted")));
    }
}
