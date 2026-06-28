package com.recruitpro.service;

import com.recruitpro.dto.request.CreatePlanRequestDto;
import com.recruitpro.dto.request.UpdatePlanRequestDto;
import com.recruitpro.dto.response.PlanResponseDto;
import com.recruitpro.dto.response.SubscriptionListItemDto;
import com.recruitpro.exception.BadRequestException;
import com.recruitpro.exception.ResourceNotFoundException;
import com.recruitpro.model.Plan;
import com.recruitpro.model.Subscription;
import com.recruitpro.model.enums.SubscriptionStatus;
import com.recruitpro.repository.PlanRepository;
import com.recruitpro.repository.SubscriptionRepository;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Root;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminSubscriptionService {

    private final PlanRepository planRepository;
    private final SubscriptionRepository subscriptionRepository;

    // ── Plans ──────────────────────────────────────────────────────────────────

    @Transactional
    public List<PlanResponseDto> listPlans() {
        expireOverdueSubscriptions();
        return planRepository.findAll(Sort.by(Sort.Direction.ASC, "price")).stream()
                .map(this::toPlanDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public PlanResponseDto createPlan(CreatePlanRequestDto req) {
        if (planRepository.existsByName(req.getName())) {
            throw new BadRequestException("A plan with this name already exists");
        }
        Plan plan = Plan.builder()
                .name(req.getName())
                .price(req.getPrice())
                .jobPostLimit(req.getJobPostLimit())
                .durationDays(req.getDurationDays())
                .allowUseAiMatching(req.isAllowUseAiMatching())
                .autoFillLimit(req.getAutoFillLimit() != null ? req.getAutoFillLimit() : 0)
                .build();
        return toPlanDto(planRepository.save(plan));
    }

    @Transactional
    public PlanResponseDto updatePlan(UUID id, UpdatePlanRequestDto req) {
        Plan plan = planRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Plan not found"));
        plan.setName(req.getName());
        plan.setPrice(req.getPrice());
        plan.setJobPostLimit(req.getJobPostLimit());
        plan.setDurationDays(req.getDurationDays());
        plan.setAllowUseAiMatching(req.isAllowUseAiMatching());
        if (req.getAutoFillLimit() != null) {
            plan.setAutoFillLimit(req.getAutoFillLimit());
        }
        return toPlanDto(planRepository.save(plan));
    }

    @Transactional
    public void deletePlan(UUID id) {
        Plan plan = planRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Plan not found"));
        if (subscriptionRepository.existsByPlanId(id)) {
            throw new BadRequestException("Cannot delete a plan that has associated subscriptions");
        }
        planRepository.delete(plan);
    }

    // ── Subscriptions ──────────────────────────────────────────────────────────

    @Transactional
    public Page<SubscriptionListItemDto> listSubscriptions(UUID planId, SubscriptionStatus status, Pageable pageable) {
        expireOverdueSubscriptions();
        Specification<Subscription> spec = Specification.where(planId != null ? hasPlanId(planId) : Specification.where(null))
                .and(status != null ? hasStatus(status) : Specification.where(null));
        return subscriptionRepository.findAll(spec, pageable)
                .map(this::toSubscriptionDto);
    }

    private static Specification<Subscription> hasPlanId(UUID planId) {
        return (root, query, cb) -> {
            if (query.getResultType() != Long.class && query.getResultType() != long.class) {
                root.fetch("company", JoinType.LEFT);
                root.fetch("plan", JoinType.LEFT);
                query.distinct(true);
            }
            return cb.equal(root.get("plan").get("id"), planId);
        };
    }

    private static Specification<Subscription> hasStatus(SubscriptionStatus status) {
        return (root, query, cb) -> cb.equal(root.get("status"), status);
    }

    // ── Mapping helpers ────────────────────────────────────────────────────────

    private PlanResponseDto toPlanDto(Plan plan) {
        long activeCount = subscriptionRepository.countByPlanIdAndStatusAndEndDateAfter(
                plan.getId(), SubscriptionStatus.ACTIVE, Instant.now());
        return PlanResponseDto.builder()
                .id(plan.getId())
                .name(plan.getName())
                .price(plan.getPrice())
                .jobPostLimit(plan.getJobPostLimit())
                .durationDays(plan.getDurationDays())
                .allowUseAiMatching(plan.isAllowUseAiMatching())
                .autoFillLimit(plan.getAutoFillLimit())
                .createdAt(plan.getCreatedAt())
                .activeSubscriptions(activeCount)
                .build();
    }

    private SubscriptionListItemDto toSubscriptionDto(Subscription sub) {
        return SubscriptionListItemDto.builder()
                .id(sub.getId())
                .companyId(sub.getCompany().getId().toString())
                .companyName(sub.getCompany().getName())
                .planId(sub.getPlan().getId().toString())
                .planName(sub.getPlan().getName())
                .startDate(sub.getStartDate())
                .endDate(sub.getEndDate())
                .status(sub.getStatus().name())
                .jobsPostedCount(sub.getJobsPostedCount())
                .createdAt(sub.getCreatedAt())
                .build();
    }

    private void expireOverdueSubscriptions() {
        subscriptionRepository.expireOverdueActiveSubscriptions(
                SubscriptionStatus.ACTIVE,
                SubscriptionStatus.EXPIRED,
                Instant.now()
        );
    }
}
