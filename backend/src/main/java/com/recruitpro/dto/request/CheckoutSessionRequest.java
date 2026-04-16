package com.recruitpro.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CheckoutSessionRequest {

    @NotBlank
    private String planId;

    /** Full URL Stripe should redirect to on success, e.g. https://app.recruitpro.com/subscriptions?payment=success */
    @NotBlank
    private String successUrl;

    /** Full URL Stripe should redirect to on cancel */
    @NotBlank
    private String cancelUrl;
}
