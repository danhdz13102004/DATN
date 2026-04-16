package com.recruitpro.controller;

import com.recruitpro.service.CompanySubscriptionService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;

/**
 * Receives Stripe webhook events.
 *
 * IMPORTANT:
 *  - This endpoint is excluded from Spring Security JWT filter (see SecurityConfig).
 *  - Raw request body bytes MUST be read directly from HttpServletRequest.getInputStream()
 *    to avoid any encoding or buffering by Spring filters (CharacterEncodingFilter, etc.)
 *    that would alter the bytes and break Stripe's HMAC signature check.
 *  - Always returns HTTP 200 so Stripe does not retry a failed delivery.
 */
@Slf4j
@RestController
@RequiredArgsConstructor
public class StripeWebhookController {

    private final CompanySubscriptionService subscriptionService;

    @PostMapping("/api/v1/webhook/stripe")
    public ResponseEntity<Void> handleStripeWebhook(
            HttpServletRequest request,
            @RequestHeader("Stripe-Signature") String sigHeader) {

        try {
            byte[] payload = request.getInputStream().readAllBytes();
            String payloadStr = new String(payload, StandardCharsets.UTF_8);
            subscriptionService.handleWebhookEvent(payloadStr, sigHeader);
        } catch (Exception e) {
            // Log but still return 200 — letting Stripe retry forever on transient errors
            // is worse than logging and moving on. Idempotency is handled by stripeSessionId.
            log.error("Stripe webhook processing error: {}", e.getMessage(), e);
        }

        return ResponseEntity.ok().build();
    }
}
