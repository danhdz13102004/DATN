package com.recruitpro.service;

import com.recruitpro.config.StripeConfig;
import com.recruitpro.dto.request.CheckoutSessionRequest;
import com.recruitpro.dto.response.CompanySubscriptionDto;
import com.recruitpro.dto.response.PaymentHistoryDto;
import com.recruitpro.dto.response.PlanResponseDto;
import com.recruitpro.exception.BadRequestException;
import com.recruitpro.exception.ResourceNotFoundException;
import com.recruitpro.model.Company;
import com.recruitpro.model.Payment;
import com.recruitpro.model.Plan;
import com.recruitpro.model.Subscription;
import com.recruitpro.model.enums.PaymentGateway;
import com.recruitpro.model.enums.PaymentStatus;
import com.recruitpro.model.enums.SubscriptionStatus;
import com.recruitpro.repository.CompanyRepository;
import com.recruitpro.repository.PaymentRepository;
import com.recruitpro.repository.PlanRepository;
import com.recruitpro.repository.SubscriptionRepository;

import com.stripe.exception.SignatureVerificationException;
import com.stripe.exception.StripeException;
import com.stripe.model.Event;
import com.stripe.model.EventDataObjectDeserializer;
import com.stripe.model.checkout.Session;
import com.stripe.net.Webhook;
import com.stripe.param.checkout.SessionCreateParams;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class CompanySubscriptionService {

    private final PlanRepository planRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final CompanyRepository companyRepository;
    private final PaymentRepository paymentRepository;
    private final StripeConfig stripeConfig;

    // ── Plans ──────────────────────────────────────────────────────────────────

    public List<PlanResponseDto> listPlans() {
        return planRepository.findAll().stream()
                .map(plan -> PlanResponseDto.builder()
                        .id(plan.getId())
                        .name(plan.getName())
                        .price(plan.getPrice())
                        .jobPostLimit(plan.getJobPostLimit())
                        .durationDays(plan.getDurationDays())
                        .allowUseAiMatching(plan.isAllowUseAiMatching())
                        .createdAt(plan.getCreatedAt())
                        .activeSubscriptions(0)
                        .build())
                .collect(Collectors.toList());
    }

    // ── Current Subscription ───────────────────────────────────────────────────

    public Optional<CompanySubscriptionDto> getCurrentSubscription(UUID companyId) {
        // First try to find an ACTIVE subscription
        return subscriptionRepository
                .findFirstByCompanyIdAndStatusOrderByCreatedAtDesc(companyId, SubscriptionStatus.ACTIVE)
                .or(() -> subscriptionRepository.findFirstByCompanyIdOrderByCreatedAtDesc(companyId))
                .map(this::toSubscriptionDto);
    }

    // ── Payment History ────────────────────────────────────────────────────────

    public Page<PaymentHistoryDto> getPaymentHistory(UUID companyId, Pageable pageable) {
        return paymentRepository.findAllByCompanyIdOrderByCreatedAtDesc(companyId, pageable)
                .map(this::toPaymentDto);
    }

    // ── Stripe Checkout ────────────────────────────────────────────────────────

    @Transactional
    public String createCheckoutSession(UUID companyId, CheckoutSessionRequest req) {
        Plan plan = planRepository.findById(UUID.fromString(req.getPlanId()))
                .orElseThrow(() -> new ResourceNotFoundException("Plan not found"));

        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Company not found"));

        // Price in cents
        long amountCents = plan.getPrice()
                .multiply(BigDecimal.valueOf(100))
                .longValue();

        String jobLimitText = plan.getJobPostLimit() == 0
                ? "Unlimited job posts"
                : plan.getJobPostLimit() + " job posts";

        String description = plan.getName() + " Plan – " + plan.getDurationDays()
                + " days · " + jobLimitText;

        try {
            SessionCreateParams params = SessionCreateParams.builder()
                    .setMode(SessionCreateParams.Mode.PAYMENT)
                    .setSuccessUrl(req.getSuccessUrl())
                    .setCancelUrl(req.getCancelUrl())
                    .addLineItem(SessionCreateParams.LineItem.builder()
                            .setPriceData(SessionCreateParams.LineItem.PriceData.builder()
                                    .setCurrency(stripeConfig.getCurrency())
                                    .setUnitAmount(amountCents)
                                    .setProductData(SessionCreateParams.LineItem.PriceData.ProductData.builder()
                                            .setName(plan.getName() + " Plan")
                                            .setDescription(description)
                                            .build())
                                    .build())
                            .setQuantity(1L)
                            .build())
                    .putMetadata("companyId", companyId.toString())
                    .putMetadata("planId", plan.getId().toString())
                    .putMetadata("planName", plan.getName())
                    .build();

            Session session = Session.create(params);

            // Persist pending payment record
            Payment payment = Payment.builder()
                    .company(company)
                    .amount(plan.getPrice())
                    .currency(stripeConfig.getCurrency())
                    .gateway(PaymentGateway.STRIPE)
                    .status(PaymentStatus.PENDING)
                    .stripeSessionId(session.getId())
                    .build();
            paymentRepository.save(payment);

            return session.getUrl();

        } catch (StripeException e) {
            log.error("Stripe checkout session creation failed: {}", e.getMessage());
            throw new BadRequestException("Payment processing error: " + e.getMessage());
        }
    }

    // ── Stripe Webhook ─────────────────────────────────────────────────────────

    @Transactional
    public void handleWebhookEvent(String payload, String sigHeader) {
        Event event;
        try {
            System.out.println("webhook secret: " + stripeConfig.getWebhookSecret());
            event = Webhook.constructEvent(payload, sigHeader, stripeConfig.getWebhookSecret());
            System.out.println("Received Stripe event: " + event.getType());
        } catch (SignatureVerificationException e) {
            log.warn("Stripe webhook signature verification failed: {}", e.getMessage());
            throw new BadRequestException("Invalid webhook signature");
        }

        if ("checkout.session.completed".equals(event.getType())) {
            EventDataObjectDeserializer deserializer = event.getDataObjectDeserializer();
            Session session;
            if (deserializer.getObject().isPresent()) {
                session = (Session) deserializer.getObject().get();
            } else {
                // API version mismatch between SDK and event — deserialize without version check
                try {
                    session = (Session) deserializer.deserializeUnsafe();
                } catch (Exception e) {
                    log.error("Failed to deserialize Stripe session: {}", e.getMessage());
                    throw new BadRequestException("Could not deserialize Stripe session");
                }
            }
            processCompletedCheckout(session);
        }
    }

    private void processCompletedCheckout(Session session) {
        String stripeSessionId = session.getId();

        // Find our pending payment record
        Payment payment = paymentRepository.findByStripeSessionId(stripeSessionId)
                .orElseGet(() -> {
                    // Reconstruct from metadata if somehow not found
                    String companyIdStr = session.getMetadata().get("companyId");
                    if (companyIdStr == null) {
                        log.warn("No pending payment found for session {} and no companyId in metadata", stripeSessionId);
                        return null;
                    }
                    Company company = companyRepository.findById(UUID.fromString(companyIdStr)).orElse(null);
                    if (company == null) return null;

                    return Payment.builder()
                            .company(company)
                            .amount(BigDecimal.valueOf(session.getAmountTotal()).divide(BigDecimal.valueOf(100)))
                            .currency(session.getCurrency())
                            .gateway(PaymentGateway.STRIPE)
                            .status(PaymentStatus.PENDING)
                            .stripeSessionId(stripeSessionId)
                            .build();
                });

        if (payment == null) {
            log.error("Could not find or reconstruct payment for session {}", stripeSessionId);
            return;
        }

        String planIdStr = session.getMetadata().get("planId");
        if (planIdStr == null) {
            log.error("No planId in Stripe session metadata for session {}", stripeSessionId);
            payment.setStatus(PaymentStatus.FAILED);
            paymentRepository.save(payment);
            return;
        }

        Plan plan = planRepository.findById(UUID.fromString(planIdStr)).orElse(null);
        if (plan == null) {
            log.error("Plan {} not found when processing webhook", planIdStr);
            payment.setStatus(PaymentStatus.FAILED);
            paymentRepository.save(payment);
            return;
        }

        // Create new subscription
        Instant now = Instant.now();
        Subscription subscription = Subscription.builder()
                .company(payment.getCompany())
                .plan(plan)
                .startDate(now)
                .endDate(now.plus(plan.getDurationDays(), ChronoUnit.DAYS))
                .status(SubscriptionStatus.ACTIVE)
                .jobsPostedCount(0)
                .allowUseAiMatching(plan.isAllowUseAiMatching())
                .build();
        subscription = subscriptionRepository.save(subscription);

        // Update payment record
        payment.setStatus(PaymentStatus.SUCCESS);
        payment.setTransactionId(session.getPaymentIntent());
        payment.setSubscription(subscription);
        paymentRepository.save(payment);

        log.info("Subscription {} created for company {} via Stripe session {}",
                subscription.getId(), payment.getCompany().getId(), stripeSessionId);
    }

    // ── Mapping ────────────────────────────────────────────────────────────────

    private CompanySubscriptionDto toSubscriptionDto(Subscription sub) {
        return CompanySubscriptionDto.builder()
                .subscriptionId(sub.getId())
                .planId(sub.getPlan().getId())
                .planName(sub.getPlan().getName())
                .planPrice(sub.getPlan().getPrice())
                .jobPostLimit(sub.getPlan().getJobPostLimit())
                .durationDays(sub.getPlan().getDurationDays())
                .allowUseAiMatching(sub.isAllowUseAiMatching())
                .startDate(sub.getStartDate())
                .endDate(sub.getEndDate())
                .status(sub.getStatus().name())
                .jobsPostedCount(sub.getJobsPostedCount())
                .build();
    }

    private PaymentHistoryDto toPaymentDto(Payment payment) {
        String description = payment.getSubscription() != null
                ? payment.getSubscription().getPlan().getName() + " Plan"
                : "Subscription Payment";
        return PaymentHistoryDto.builder()
                .id(payment.getId())
                .amount(payment.getAmount())
                .currency(payment.getCurrency())
                .gateway(payment.getGateway().name())
                .status(payment.getStatus().name())
                .transactionId(payment.getTransactionId())
                .description(description)
                .createdAt(payment.getCreatedAt())
                .build();
    }
}
