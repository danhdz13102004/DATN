package com.recruitpro.controller;

import com.recruitpro.dto.request.CheckoutSessionRequest;
import com.recruitpro.dto.response.ApiResponse;
import com.recruitpro.dto.response.CompanySubscriptionDto;
import com.recruitpro.dto.response.PaginationMeta;
import com.recruitpro.dto.response.PaymentHistoryDto;
import com.recruitpro.dto.response.PlanResponseDto;
import com.recruitpro.security.UserPrincipal;
import com.recruitpro.service.CompanySubscriptionService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/company/subscription")
@RequiredArgsConstructor
@PreAuthorize("hasRole('COMPANY')")
public class CompanySubscriptionController {

    private final CompanySubscriptionService subscriptionService;

    /** GET /api/v1/company/subscription/plans — list all available plans (no auth guard needed,
     *  but inherits the class-level @PreAuthorize; adjust if you want public access) */
    @GetMapping("/plans")
    public ResponseEntity<ApiResponse<List<PlanResponseDto>>> listPlans() {
        return ResponseEntity.ok(ApiResponse.ok(subscriptionService.listPlans()));
    }

    /** GET /api/v1/company/subscription — current active subscription (null-safe) */
    @GetMapping
    public ResponseEntity<ApiResponse<CompanySubscriptionDto>> getCurrentSubscription(
            @AuthenticationPrincipal UserPrincipal principal) {

        UUID companyId = UUID.fromString(principal.getCompanyId());
        return subscriptionService.getCurrentSubscription(companyId)
                .map(dto -> ResponseEntity.ok(ApiResponse.ok(dto)))
                .orElse(ResponseEntity.ok(ApiResponse.ok(null)));
    }

    /** GET /api/v1/company/subscription/payments — paginated payment history */
    @GetMapping("/payments")
    public ResponseEntity<ApiResponse<List<PaymentHistoryDto>>> getPaymentHistory(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        UUID companyId = UUID.fromString(principal.getCompanyId());
        Page<PaymentHistoryDto> result = subscriptionService.getPaymentHistory(
                companyId, PageRequest.of(page, size));

        return ResponseEntity.ok(ApiResponse.ok(
                result.getContent(),
                PaginationMeta.builder()
                        .page(page)
                        .pageSize(size)
                        .total(result.getTotalElements())
                        .build()
        ));
    }

    /** POST /api/v1/company/subscription/checkout — create Stripe checkout session */
    @PostMapping("/checkout")
    public ResponseEntity<ApiResponse<Map<String, String>>> createCheckout(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CheckoutSessionRequest req) {

        UUID companyId = UUID.fromString(principal.getCompanyId());
        String sessionUrl = subscriptionService.createCheckoutSession(companyId, req);

        return ResponseEntity.ok(ApiResponse.ok(Map.of("sessionUrl", sessionUrl)));
    }
}
