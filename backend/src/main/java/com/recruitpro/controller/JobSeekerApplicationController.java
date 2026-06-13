package com.recruitpro.controller;

import com.recruitpro.dto.request.ApplyRequestDto;
import com.recruitpro.dto.response.*;
import com.recruitpro.model.Application;
import com.recruitpro.model.enums.ApplicationStatus;
import com.recruitpro.security.UserPrincipal;
import com.recruitpro.service.AiServiceClient;
import com.recruitpro.service.JobSeekerApplicationService;
import com.recruitpro.service.JobSeekerService;
import com.recruitpro.service.JobService;
import jakarta.validation.Valid;
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
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/jobseeker/applications")
@PreAuthorize("hasRole('JOBSEEKER')")
@RequiredArgsConstructor
public class JobSeekerApplicationController {

    private final JobSeekerApplicationService applicationService;
    private final JobSeekerService jobSeekerService;
    private final JobService jobService;
    private final AiServiceClient aiServiceClient;

    @GetMapping
    public ResponseEntity<ApiResponse<Object>> list(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search,
            @PageableDefault(size = 20) Pageable pageable
    ) {
        UUID seekerId = jobSeekerService.findByUserId(UUID.fromString(principal.getId())).getId();
        ApplicationStatus statusEnum = status != null && !status.isEmpty()
                ? ApplicationStatus.valueOf(status) : null;

        Page<JobSeekerApplicationListItemDto> page = applicationService.listForSeeker(
                seekerId, statusEnum, search, pageable);

        PaginationMeta meta = PaginationMeta.builder()
                .page(page.getNumber() + 1)
                .pageSize(page.getSize())
                .total(page.getTotalElements())
                .build();

        return ResponseEntity.ok(ApiResponse.ok(page.getContent(), meta));
    }

    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<JobSeekerApplicationStatsDto>> getStats(
            @AuthenticationPrincipal UserPrincipal principal) {
        UUID seekerId = jobSeekerService.findByUserId(UUID.fromString(principal.getId())).getId();
        return ResponseEntity.ok(ApiResponse.ok(applicationService.getStats(seekerId)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<JobSeekerApplicationDetailDto>> getDetail(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {
        UUID seekerId = jobSeekerService.findByUserId(UUID.fromString(principal.getId())).getId();
        return ResponseEntity.ok(ApiResponse.ok(applicationService.getDetail(id, seekerId)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Map<String, UUID>>> apply(
            @RequestBody @Valid ApplyRequestDto request,
            @AuthenticationPrincipal UserPrincipal principal) {
        UUID seekerId = jobSeekerService.findByUserId(UUID.fromString(principal.getId())).getId();
        Application app = applicationService.apply(
                seekerId, request.getJobId(), request.getResumeId(), request.getCoverLetter());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(Map.of("applicationId", app.getId())));
    }

    @PatchMapping("/{id}/withdraw")
    public ResponseEntity<ApiResponse<Map<String, String>>> withdraw(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {
        UUID seekerId = jobSeekerService.findByUserId(UUID.fromString(principal.getId())).getId();
        applicationService.withdraw(id, seekerId);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("message", "Application withdrawn")));
    }

    @GetMapping("/applied-job-ids")
    public ResponseEntity<ApiResponse<List<UUID>>> getAppliedJobIds(
            @AuthenticationPrincipal UserPrincipal principal) {
        UUID seekerId = jobSeekerService.findByUserId(UUID.fromString(principal.getId())).getId();
        List<UUID> ids = applicationService.findAppliedJobIds(seekerId);
        return ResponseEntity.ok(ApiResponse.ok(ids));
    }

    @GetMapping("/recommendations")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getRecommendations(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam UUID resumeId,
            @RequestParam(defaultValue = "25") int topK,
            @RequestParam(defaultValue = "resume") String mode,
            @RequestParam(required = false) String userId) {

        UUID seekerId = jobSeekerService.findByUserId(UUID.fromString(principal.getId())).getId();

        // 1. Get applied job IDs to exclude
        List<UUID> appliedJobIds = applicationService.findAppliedJobIds(seekerId);
        String excluded = appliedJobIds.stream()
                .map(UUID::toString)
                .collect(Collectors.joining(","));

        // 2. Call AI service — activities mode uses seekerId, resume mode ignores it
        String effectiveUserId = "activities".equals(mode) ? seekerId.toString() : null;
        Map<String, Object> aiResponse =
                aiServiceClient.getRecommendationsWithMeta(resumeId.toString(), topK, excluded, mode, effectiveUserId);

        if (aiResponse == null) {
            return ResponseEntity.ok(ApiResponse.ok(Map.of("recommendations", List.of(), "meta", Map.of())));
        }

        // 3. Extract recommendations and meta
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> aiRecommendations = (List<Map<String, Object>>) aiResponse.get("recommendations");
        @SuppressWarnings("unchecked")
        Map<String, Object> meta = (Map<String, Object>) aiResponse.getOrDefault("meta", Map.of());

        if (aiRecommendations == null || aiRecommendations.isEmpty()) {
            return ResponseEntity.ok(ApiResponse.ok(Map.of("recommendations", List.of(), "meta", meta)));
        }

        // 4. Fetch full JobDto objects, preserving AI ordering
        List<UUID> jobIds = aiRecommendations.stream()
                .map(r -> UUID.fromString((String) r.get("job_id")))
                .collect(Collectors.toList());
        List<JobDto> jobs = jobService.findByIds(jobIds, seekerId);

        // 5. Build result map: job DTO + AI score + meta
        Map<String, Double> scoreMap = aiRecommendations.stream()
                .collect(Collectors.toMap(
                        r -> (String) r.get("job_id"),
                        r -> ((Number) r.get("score")).doubleValue(),
                        (existing, replacement) -> existing
                ));

        List<Map<String, Object>> result = jobs.stream().map(job -> {
            Map<String, Object> m = new java.util.LinkedHashMap<>();
            m.put("job", job);
            m.put("score", scoreMap.getOrDefault(job.getId().toString(), 0.0));
            return m;
        }).collect(Collectors.toList());

        Map<String, Object> responseBody = new java.util.LinkedHashMap<>();
        responseBody.put("recommendations", result);
        responseBody.put("meta", meta);

        return ResponseEntity.ok(ApiResponse.ok(responseBody));
    }
}
