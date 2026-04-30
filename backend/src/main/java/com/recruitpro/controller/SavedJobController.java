package com.recruitpro.controller;

import com.recruitpro.dto.response.ApiResponse;
import com.recruitpro.dto.response.PaginationMeta;
import com.recruitpro.dto.response.SavedJobDto;
import com.recruitpro.model.JobSeeker;
import com.recruitpro.security.UserPrincipal;
import com.recruitpro.service.JobSeekerService;
import com.recruitpro.service.SavedJobService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@PreAuthorize("hasRole('JOBSEEKER')")
@RequiredArgsConstructor
public class SavedJobController {

    private final SavedJobService savedJobService;
    private final JobSeekerService jobSeekerService;

    /** POST /api/v1/jobs/{jobId}/save */
    @PostMapping("/jobs/{jobId}/save")
    public ResponseEntity<ApiResponse<SavedJobDto>> save(
            @PathVariable UUID jobId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        UUID seekerId = seekerId(principal);
        return ResponseEntity.ok(ApiResponse.ok(savedJobService.save(seekerId, jobId)));
    }

    /** DELETE /api/v1/jobs/{jobId}/save */
    @DeleteMapping("/jobs/{jobId}/save")
    public ResponseEntity<ApiResponse<Void>> unsave(
            @PathVariable UUID jobId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        UUID seekerId = seekerId(principal);
        savedJobService.unsave(seekerId, jobId);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    /** GET /api/v1/jobs/{jobId}/save/status */
    @GetMapping("/jobs/{jobId}/save/status")
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> saveStatus(
            @PathVariable UUID jobId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        UUID seekerId = seekerId(principal);
        boolean saved = savedJobService.isSaved(seekerId, jobId);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("isSaved", saved)));
    }

    /** GET /api/v1/jobseeker/saved-jobs */
    @GetMapping("/jobseeker/saved-jobs")
    public ResponseEntity<ApiResponse<Object>> listSaved(
            @AuthenticationPrincipal UserPrincipal principal,
            @PageableDefault(size = 20) Pageable pageable
    ) {
        UUID seekerId = seekerId(principal);
        Page<SavedJobDto> page = savedJobService.listSaved(seekerId, pageable);
        PaginationMeta meta = PaginationMeta.builder()
                .page(page.getNumber() + 1)
                .pageSize(page.getSize())
                .total(page.getTotalElements())
                .build();
        return ResponseEntity.ok(ApiResponse.ok(page.getContent(), meta));
    }

    private UUID seekerId(UserPrincipal principal) {
        JobSeeker seeker = jobSeekerService.findByUserId(UUID.fromString(principal.getId()));
        return seeker.getId();
    }
}
