package com.recruitpro.service;

import com.recruitpro.dto.response.DashboardStatsResponseDto;
import com.recruitpro.dto.response.RecentApplicationDto;
import com.recruitpro.model.Application;
import com.recruitpro.model.enums.InterviewStatus;
import com.recruitpro.model.enums.JobStatus;
import com.recruitpro.repository.ApplicationRepository;
import com.recruitpro.repository.InterviewRepository;
import com.recruitpro.repository.JobRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class DashboardService {

    private final JobRepository jobRepository;
    private final ApplicationRepository applicationRepository;
    private final InterviewRepository interviewRepository;

    public DashboardStatsResponseDto getStats(UUID companyId) {
        long totalJobs = jobRepository.findAllByCompanyId(companyId, PageRequest.of(0, 1)).getTotalElements();
        long activeApplications = applicationRepository.countByCompanyId(companyId);

        // Calculate interviews this week
        ZonedDateTime now = ZonedDateTime.now(ZoneId.systemDefault());
        Instant weekStart = now.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
                .toLocalDate().atStartOfDay(now.getZone()).toInstant();
        Instant weekEnd = now.with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY))
                .toLocalDate().atTime(23, 59, 59).atZone(now.getZone()).toInstant();

        long interviewsThisWeek = interviewRepository.countByCompanyId(companyId);

        // Trends are calculated as simple placeholders — would need historical data for real trends
        DashboardStatsResponseDto.TrendDto trends = DashboardStatsResponseDto.TrendDto.builder()
                .jobsTrend(0)
                .applicationsTrend(0)
                .interviewsTrend(0)
                .build();

        return DashboardStatsResponseDto.builder()
                .totalJobs(totalJobs)
                .activeApplications(activeApplications)
                .interviewsThisWeek(interviewsThisWeek)
                .newMessagesUnread(0) // Will be implemented with Messages module
                .unreadNotifications(0) // Will be implemented with Notifications module
                .trends(trends)
                .build();
    }

    public List<RecentApplicationDto> getRecentApplications(UUID companyId) {
        return applicationRepository.findRecentByCompanyId(companyId, PageRequest.of(0, 5))
                .getContent()
                .stream()
                .map(this::toRecentDto)
                .toList();
    }

    private RecentApplicationDto toRecentDto(Application app) {
        return RecentApplicationDto.builder()
                .id(app.getId().toString())
                .candidateName(app.getJobSeeker() != null ? app.getJobSeeker().getUser().getEmail() : "Unknown")
                .candidateEmail(app.getJobSeeker() != null ? app.getJobSeeker().getUser().getEmail() : null)
                .jobTitle(app.getJob() != null ? app.getJob().getTitle() : "Unknown")
                .aiScore(app.getAiScore())
                .status(app.getStatus().name())
                .appliedAt(app.getCreatedAt())
                .build();
    }
}
