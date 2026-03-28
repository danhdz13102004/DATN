package com.recruitpro.service;

import com.recruitpro.dto.request.ApplicationStatusUpdateRequestDto;
import com.recruitpro.dto.response.*;
import com.recruitpro.exception.ForbiddenException;
import com.recruitpro.exception.ResourceNotFoundException;
import com.recruitpro.model.Application;
import com.recruitpro.model.Resume;
import com.recruitpro.model.enums.ApplicationStatus;
import com.recruitpro.repository.ApplicationRepository;
import com.recruitpro.repository.ResumeRepository;
import com.recruitpro.security.UserPrincipal;
import com.recruitpro.storage.StorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ApplicationService {

    private final ApplicationRepository applicationRepository;
    private final ResumeRepository resumeRepository;
    private final StorageService storageService;

    // ── List Applications ─────────────────────────

    public Page<ApplicationListItemDto> listForCompany(
            UUID companyId, ApplicationStatus status, UUID jobId,
            String search, Pageable pageable
    ) {
        Page<Application> page = applicationRepository.findByCompanyFilters(
                companyId, status, jobId, search, pageable
        );

        return page.map(app -> ApplicationListItemDto.builder()
                .id(app.getId().toString())
                .candidateName(app.getJobSeeker().getUser().getEmail()) // email as name fallback
                .candidateEmail(app.getJobSeeker().getUser().getEmail())
                .candidateAvatar(app.getJobSeeker().getAvatarUrl())
                .jobId(app.getJobId().toString())
                .jobTitle(app.getJob().getTitle())
                .aiScore(app.getAiScore())
                .status(app.getStatus().name())
                .hasScheduledInterview(applicationRepository.hasScheduledInterview(app.getId()))
                .appliedAt(app.getCreatedAt())
                .build()
        );
    }

    // ── Application Stats ─────────────────────────

    public ApplicationStatsDto getStats(UUID companyId) {
        return ApplicationStatsDto.builder()
                .total(applicationRepository.countByCompanyId(companyId))
                .screening(applicationRepository.countByCompanyIdAndStatus(companyId, ApplicationStatus.SCREENING))
                .interview(applicationRepository.countByCompanyIdAndStatus(companyId, ApplicationStatus.INTERVIEW))
                .hired(applicationRepository.countByCompanyIdAndStatus(companyId, ApplicationStatus.HIRED))
                .build();
    }

    // ── Application Detail ────────────────────────

    public ApplicationDetailResponseDto getDetail(UUID applicationId, UUID companyId) {
        Application app = applicationRepository.findByIdAndCompanyId(applicationId, companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Application not found"));

        // Build timeline events
        List<ApplicationDetailResponseDto.TimelineEventDto> timeline = new ArrayList<>();
        timeline.add(ApplicationDetailResponseDto.TimelineEventDto.builder()
                .type("APPLICATION_RECEIVED")
                .description("Application received")
                .timestamp(app.getCreatedAt())
                .build());

        if (app.getAiScore() != null) {
            timeline.add(ApplicationDetailResponseDto.TimelineEventDto.builder()
                    .type("AI_SCORE")
                    .description("AI Score calculated: " + Math.round(app.getAiScore()) + "%")
                    .timestamp(app.getCreatedAt()) // AI score is calculated on submission
                    .build());
        }

        if (app.getStatus() != ApplicationStatus.APPLIED) {
            timeline.add(ApplicationDetailResponseDto.TimelineEventDto.builder()
                    .type("STATUS_CHANGE")
                    .description("Status changed to " + app.getStatus().name())
                    .timestamp(app.getUpdatedAt() != null ? app.getUpdatedAt() : app.getCreatedAt())
                    .build());
        }

        return ApplicationDetailResponseDto.builder()
                .id(app.getId().toString())
                .candidateName(app.getJobSeeker().getUser().getEmail())
                .candidateEmail(app.getJobSeeker().getUser().getEmail())
                .candidateAvatar(app.getJobSeeker().getAvatarUrl())
                .candidateLocation(app.getJobSeeker().getLocation())
                .candidateExperienceYears(app.getJobSeeker().getExperienceYears())
                .candidateBio(app.getJobSeeker().getBio())
                .jobId(app.getJobId().toString())
                .jobTitle(app.getJob().getTitle())
                .aiScore(app.getAiScore())
                .status(app.getStatus().name())
                .hasScheduledInterview(applicationRepository.hasScheduledInterview(app.getId()))
                .resumeUrl(app.getResumeId() != null ? "/api/v1/company/applications/" + app.getId() + "/resume" : null)
                .appliedAt(app.getCreatedAt())
                .timeline(timeline)
                .build();
    }

    // ── Update Status ─────────────────────────────

    @Transactional
    public ApplicationDetailResponseDto updateStatus(
            UUID applicationId, ApplicationStatusUpdateRequestDto request, UUID companyId
    ) {
        Application app = applicationRepository.findByIdAndCompanyId(applicationId, companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Application not found"));

        ApplicationStatus newStatus = ApplicationStatus.valueOf(request.getStatus());
        app.setStatus(newStatus);
        applicationRepository.save(app);

        log.info("Application {} status changed to {} (companyId={})", applicationId, newStatus, companyId);

        return getDetail(applicationId, companyId);
    }

    // ── Resume Download ───────────────────────────

    public String getResumeDownloadUrl(UUID applicationId, UUID companyId) {
        Application app = applicationRepository.findByIdAndCompanyId(applicationId, companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Application not found"));

        if (app.getResumeId() == null) {
            throw new ResourceNotFoundException("No resume attached to this application");
        }

        Resume resume = resumeRepository.findById(app.getResumeId())
                .orElseThrow(() -> new ResourceNotFoundException("Resume file not found"));

        return storageService.getDownloadUrl(resume.getFileUrl());
    }

    // ── Select Options ────────────────────────────

    public List<ApplicationListItemDto> getSelectOptions(UUID companyId) {
        List<Application> apps = applicationRepository.findSelectOptionsByCompanyId(companyId);
        return apps.stream().map(app -> ApplicationListItemDto.builder()
                .id(app.getId().toString())
                .candidateName(app.getJobSeeker() != null ? app.getJobSeeker().getUser().getEmail() : "Unknown")
                .jobTitle(app.getJob() != null ? app.getJob().getTitle() : "Unknown")
                .build()
        ).toList();
    }
}
