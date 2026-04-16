package com.recruitpro.controller;

import com.recruitpro.dto.request.CreatePlanRequestDto;
import com.recruitpro.dto.request.UpdatePlanRequestDto;
import com.recruitpro.dto.response.ApiResponse;
import com.recruitpro.dto.response.PaginationMeta;
import com.recruitpro.dto.response.PlanResponseDto;
import com.recruitpro.dto.response.SubscriptionListItemDto;
import com.recruitpro.model.enums.SubscriptionStatus;
import com.recruitpro.service.AdminSubscriptionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminSubscriptionController {

    private final AdminSubscriptionService adminSubscriptionService;

    // ── Plans ──────────────────────────────────────────────────────────────────

    @GetMapping("/api/v1/admin/plans")
    public ResponseEntity<ApiResponse<List<PlanResponseDto>>> listPlans() {
        return ResponseEntity.ok(ApiResponse.ok(adminSubscriptionService.listPlans()));
    }

    @PostMapping("/api/v1/admin/plans")
    public ResponseEntity<ApiResponse<PlanResponseDto>> createPlan(
            @Valid @RequestBody CreatePlanRequestDto req
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(adminSubscriptionService.createPlan(req)));
    }

    @PutMapping("/api/v1/admin/plans/{id}")
    public ResponseEntity<ApiResponse<PlanResponseDto>> updatePlan(
            @PathVariable UUID id,
            @Valid @RequestBody UpdatePlanRequestDto req
    ) {
        return ResponseEntity.ok(ApiResponse.ok(adminSubscriptionService.updatePlan(id, req)));
    }

    @DeleteMapping("/api/v1/admin/plans/{id}")
    public ResponseEntity<ApiResponse<Void>> deletePlan(@PathVariable UUID id) {
        adminSubscriptionService.deletePlan(id);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    // ── Subscriptions ──────────────────────────────────────────────────────────

    @GetMapping("/api/v1/admin/subscriptions")
    public ResponseEntity<ApiResponse<Object>> listSubscriptions(
            @RequestParam(required = false) UUID planId,
            @RequestParam(required = false) SubscriptionStatus status,
            @PageableDefault(size = 20) Pageable pageable
    ) {
        Page<SubscriptionListItemDto> page = adminSubscriptionService.listSubscriptions(planId, status, pageable);
        PaginationMeta meta = PaginationMeta.builder()
                .page(page.getNumber() + 1)
                .pageSize(page.getSize())
                .total(page.getTotalElements())
                .build();
        return ResponseEntity.ok(ApiResponse.ok(page.getContent(), meta));
    }
}
