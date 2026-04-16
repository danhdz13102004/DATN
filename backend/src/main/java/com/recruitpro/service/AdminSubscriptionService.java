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
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminSubscriptionService {

    private final PlanRepository planRepository;
    private final SubscriptionRepository subscriptionRepository;

    // ── Plans ──────────────────────────────────────────────────────────────────

    public List<PlanResponseDto> listPlans() {
        return planRepository.findAll().stream()
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

    public Page<SubscriptionListItemDto> listSubscriptions(UUID planId, SubscriptionStatus status, Pageable pageable) {
        return subscriptionRepository.findAllWithFilters(planId, status, pageable)
                .map(this::toSubscriptionDto);
    }

    // ── Mapping helpers ────────────────────────────────────────────────────────

    private PlanResponseDto toPlanDto(Plan plan) {
        long activeCount = subscriptionRepository.countByPlanIdAndStatus(plan.getId(), SubscriptionStatus.ACTIVE);
        return PlanResponseDto.builder()
                .id(plan.getId())
                .name(plan.getName())
                .price(plan.getPrice())
                .jobPostLimit(plan.getJobPostLimit())
                .durationDays(plan.getDurationDays())
                .allowUseAiMatching(plan.isAllowUseAiMatching())
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
}
