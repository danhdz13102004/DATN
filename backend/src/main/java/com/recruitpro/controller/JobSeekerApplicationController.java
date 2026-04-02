package com.recruitpro.controller;

import com.recruitpro.dto.request.ApplyRequestDto;
import com.recruitpro.dto.response.*;
import com.recruitpro.model.Application;
import com.recruitpro.model.enums.ApplicationStatus;
import com.recruitpro.security.UserPrincipal;
import com.recruitpro.service.JobSeekerApplicationService;
import com.recruitpro.service.JobSeekerService;
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

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/jobseeker/applications")
@PreAuthorize("hasRole('JOBSEEKER')")
@RequiredArgsConstructor
public class JobSeekerApplicationController {

    private final JobSeekerApplicationService applicationService;
    private final JobSeekerService jobSeekerService;

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
}
