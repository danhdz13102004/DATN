package com.recruitpro.controller;

import com.recruitpro.dto.request.CreateInterviewRequestDto;
import com.recruitpro.dto.request.UpdateInterviewRequestDto;
import com.recruitpro.dto.response.ApiResponse;
import com.recruitpro.dto.response.InterviewResponseDto;
import com.recruitpro.dto.response.InterviewStatsDto;
import com.recruitpro.dto.response.PaginationMeta;
import com.recruitpro.model.enums.InterviewStatus;
import com.recruitpro.security.UserPrincipal;
import com.recruitpro.service.InterviewService;
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

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/company/interviews")
@PreAuthorize("hasRole('COMPANY')")
@RequiredArgsConstructor
public class InterviewController {

    private final InterviewService interviewService;

    @GetMapping
    public ResponseEntity<ApiResponse<Object>> listInterviews(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) Instant from,
            @RequestParam(required = false) Instant to,
            @PageableDefault(size = 50) Pageable pageable
    ) {
        UUID companyId = UUID.fromString(principal.getCompanyId());

        Page<InterviewResponseDto> page = interviewService.listForCompany(companyId, from, to, pageable);
        InterviewStatsDto stats = interviewService.getStats(companyId);

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
    public ResponseEntity<ApiResponse<InterviewResponseDto>> getDetail(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        UUID companyId = UUID.fromString(principal.getCompanyId());
        return ResponseEntity.ok(ApiResponse.ok(interviewService.getDetail(id, companyId)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<InterviewResponseDto>> schedule(
            @RequestBody @Valid CreateInterviewRequestDto request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        UUID companyId = UUID.fromString(principal.getCompanyId());
        UUID staffUserId = UUID.fromString(principal.getId());
        InterviewResponseDto response = interviewService.schedule(request, companyId, staffUserId);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<InterviewResponseDto>> update(
            @PathVariable UUID id,
            @RequestBody @Valid UpdateInterviewRequestDto request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        UUID companyId = UUID.fromString(principal.getCompanyId());
        return ResponseEntity.ok(ApiResponse.ok(interviewService.update(id, request, companyId)));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<InterviewResponseDto>> changeStatus(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        UUID companyId = UUID.fromString(principal.getCompanyId());
        InterviewStatus newStatus = InterviewStatus.valueOf(body.get("status"));
        return ResponseEntity.ok(ApiResponse.ok(interviewService.changeStatus(id, newStatus, companyId)));
    }
}
