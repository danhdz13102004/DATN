package com.recruitpro.controller;

import com.recruitpro.dto.request.ApplicationStatusUpdateRequestDto;
import com.recruitpro.dto.response.*;
import com.recruitpro.model.enums.ApplicationStatus;
import com.recruitpro.security.UserPrincipal;
import com.recruitpro.service.ApplicationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/company/applications")
@PreAuthorize("hasRole('COMPANY')")
@RequiredArgsConstructor
public class ApplicationController {

    private final ApplicationService applicationService;

    @GetMapping
    public ResponseEntity<ApiResponse<Object>> listApplications(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String jobId,
            @RequestParam(required = false) String search,
            @PageableDefault(size = 20) Pageable pageable
    ) {
        UUID companyId = UUID.fromString(principal.getCompanyId());
        ApplicationStatus statusEnum = status != null && !status.isEmpty()
                ? ApplicationStatus.valueOf(status) : null;
        UUID jobUuid = jobId != null && !jobId.isEmpty() ? UUID.fromString(jobId) : null;

        Page<ApplicationListItemDto> page = applicationService.listForCompany(
                companyId, statusEnum, jobUuid, search, pageable
        );
        ApplicationStatsDto stats = applicationService.getStats(companyId);

        PaginationMeta meta = PaginationMeta.builder()
                .page(page.getNumber() + 1)
                .pageSize(page.getSize())
                .total(page.getTotalElements())
                .build();

        return ResponseEntity.ok(ApiResponse.ok(
                Map.of("items", page.getContent(), "stats", stats),
                meta
        ));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ApplicationDetailResponseDto>> getDetail(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        UUID companyId = UUID.fromString(principal.getCompanyId());
        return ResponseEntity.ok(ApiResponse.ok(applicationService.getDetail(id, companyId)));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<ApplicationDetailResponseDto>> updateStatus(
            @PathVariable UUID id,
            @RequestBody @Valid ApplicationStatusUpdateRequestDto request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        UUID companyId = UUID.fromString(principal.getCompanyId());
        return ResponseEntity.ok(ApiResponse.ok(applicationService.updateStatus(id, request, companyId)));
    }

    @GetMapping("/{id}/resume")
    public ResponseEntity<ApiResponse<Map<String, String>>> getResumeUrl(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        UUID companyId = UUID.fromString(principal.getCompanyId());
        String url = applicationService.getResumeDownloadUrl(id, companyId);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("url", url)));
    }

    @GetMapping("/select-options")
    public ResponseEntity<ApiResponse<List<ApplicationListItemDto>>> getSelectOptions(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        UUID companyId = UUID.fromString(principal.getCompanyId());
        return ResponseEntity.ok(ApiResponse.ok(applicationService.getSelectOptions(companyId)));
    }
}
