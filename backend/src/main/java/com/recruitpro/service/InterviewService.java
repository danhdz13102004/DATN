package com.recruitpro.service;

import com.recruitpro.dto.request.CreateInterviewRequestDto;
import com.recruitpro.dto.request.UpdateInterviewRequestDto;
import com.recruitpro.dto.response.InterviewResponseDto;
import com.recruitpro.dto.response.InterviewStatsDto;
import com.recruitpro.exception.ResourceNotFoundException;
import com.recruitpro.model.Application;
import com.recruitpro.model.Interview;
import com.recruitpro.model.enums.ApplicationStatus;
import com.recruitpro.model.enums.InterviewStatus;
import com.recruitpro.model.enums.MeetingType;
import com.recruitpro.repository.ApplicationRepository;
import com.recruitpro.repository.InterviewRepository;
import com.recruitpro.repository.StaffRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class InterviewService {

    private final InterviewRepository interviewRepository;
    private final ApplicationRepository applicationRepository;
    private final StaffRepository staffRepository;

    // ── List Interviews ───────────────────────────

    public Page<InterviewResponseDto> listForCompany(
            UUID companyId, Instant from, Instant to, Pageable pageable
    ) {
        Page<Interview> page = interviewRepository.findByCompanyIdAndDateRange(companyId, from, to, pageable);
        return page.map(this::toDto);
    }

    // ── Interview Stats ───────────────────────────

    public InterviewStatsDto getStats(UUID companyId) {
        return InterviewStatsDto.builder()
                .total(interviewRepository.countByCompanyId(companyId))
                .pending(interviewRepository.countByCompanyIdAndStatus(companyId, InterviewStatus.PENDING))
                .completed(interviewRepository.countByCompanyIdAndStatus(companyId, InterviewStatus.COMPLETED))
                .cancelled(interviewRepository.countByCompanyIdAndStatus(companyId, InterviewStatus.CANCELLED))
                .build();
    }

    // ── Interview Detail ──────────────────────────

    public InterviewResponseDto getDetail(UUID interviewId, UUID companyId) {
        Interview interview = interviewRepository.findByIdAndCompanyId(interviewId, companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Interview not found"));
        return toDto(interview);
    }

    // ── Schedule Interview ────────────────────────

    @Transactional
    public InterviewResponseDto schedule(CreateInterviewRequestDto request, UUID companyId, UUID staffUserId) {
        UUID applicationId = UUID.fromString(request.getApplicationId());

        // Verify application belongs to company
        Application application = applicationRepository.findByIdAndCompanyId(applicationId, companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Application not found"));

        // Find the staff record for the current user
        var staff = staffRepository.findByUserId(staffUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Staff record not found"));

        Interview interview = Interview.builder()
                .applicationId(applicationId)
                .interviewerId(staff.getId())
                .scheduledTime(request.getScheduledTime())
                .meetingType(MeetingType.valueOf(request.getMeetingType()))
                .meetingLink(request.getMeetingLink())
                .note(request.getNote())
                .status(InterviewStatus.PENDING)
                .build();

        Interview saved = interviewRepository.save(interview);

        // Update application status to INTERVIEW
        application.setStatus(ApplicationStatus.INTERVIEW);
        applicationRepository.save(application);

        log.info("Interview scheduled: {} for application {} (companyId={})",
                saved.getId(), applicationId, companyId);

        return getDetail(saved.getId(), companyId);
    }

    // ── Update/Reschedule Interview ───────────────

    @Transactional
    public InterviewResponseDto update(UUID interviewId, UpdateInterviewRequestDto request, UUID companyId) {
        Interview interview = interviewRepository.findByIdAndCompanyId(interviewId, companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Interview not found"));

        if (request.getScheduledTime() != null) interview.setScheduledTime(request.getScheduledTime());
        if (request.getMeetingType() != null) interview.setMeetingType(MeetingType.valueOf(request.getMeetingType()));
        if (request.getMeetingLink() != null) interview.setMeetingLink(request.getMeetingLink());
        if (request.getNote() != null) interview.setNote(request.getNote());

        interviewRepository.save(interview);
        log.info("Interview updated: {} (companyId={})", interviewId, companyId);

        return getDetail(interviewId, companyId);
    }

    // ── Change Interview Status ───────────────────

    @Transactional
    public InterviewResponseDto changeStatus(UUID interviewId, InterviewStatus newStatus, UUID companyId) {
        Interview interview = interviewRepository.findByIdAndCompanyId(interviewId, companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Interview not found"));

        interview.setStatus(newStatus);
        interviewRepository.save(interview);

        log.info("Interview {} status changed to {} (companyId={})", interviewId, newStatus, companyId);

        return getDetail(interviewId, companyId);
    }

    // ── Mapper ────────────────────────────────────

    private InterviewResponseDto toDto(Interview i) {
        InterviewResponseDto.InterviewResponseDtoBuilder builder = InterviewResponseDto.builder()
                .id(i.getId().toString())
                .applicationId(i.getApplicationId().toString())
                .scheduledTime(i.getScheduledTime())
                .meetingType(i.getMeetingType().name())
                .meetingLink(i.getMeetingLink())
                .status(i.getStatus().name())
                .note(i.getNote())
                .createdAt(i.getCreatedAt());

        if (i.getApplication() != null && i.getApplication().getJobSeeker() != null) {
            builder.candidateName(i.getApplication().getJobSeeker().getUser().getEmail());
            builder.candidateEmail(i.getApplication().getJobSeeker().getUser().getEmail());
            builder.candidateAvatar(i.getApplication().getJobSeeker().getAvatarUrl());
        }
        if (i.getApplication() != null && i.getApplication().getJob() != null) {
            builder.jobTitle(i.getApplication().getJob().getTitle());
        }
        if (i.getInterviewer() != null && i.getInterviewer().getUser() != null) {
            builder.interviewerName(i.getInterviewer().getUser().getEmail());
        }

        return builder.build();
    }
}
