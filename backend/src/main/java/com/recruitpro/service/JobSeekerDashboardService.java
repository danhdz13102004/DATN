package com.recruitpro.service;

import com.recruitpro.dto.response.JobSeekerApplicationListItemDto;
import com.recruitpro.dto.response.JobSeekerDashboardStatsDto;
import com.recruitpro.dto.response.JobSeekerInterviewListItemDto;
import com.recruitpro.model.Application;
import com.recruitpro.model.Company;
import com.recruitpro.model.Interview;
import com.recruitpro.model.enums.InterviewStatus;
import com.recruitpro.repository.ApplicationRepository;
import com.recruitpro.repository.CompanyRepository;
import com.recruitpro.repository.InterviewRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class JobSeekerDashboardService {

    private final ApplicationRepository applicationRepository;
    private final InterviewRepository interviewRepository;
    private final CompanyRepository companyRepository;

    public JobSeekerDashboardStatsDto getStats(UUID seekerId) {
        long jobsApplied = applicationRepository.countByJobSeekerId(seekerId);
        long interviewsCount = interviewRepository.countByJobSeekerIdAndStatus(seekerId, InterviewStatus.PENDING)
                + interviewRepository.countByJobSeekerIdAndStatus(seekerId, InterviewStatus.COMPLETED);
        long upcoming = interviewRepository.countByJobSeekerIdAndStatus(seekerId, InterviewStatus.PENDING);

        return JobSeekerDashboardStatsDto.builder()
                .jobsApplied(jobsApplied)
                .interviewsCount(interviewsCount)
                .upcomingInterviews(upcoming)
                .build();
    }

    public List<JobSeekerApplicationListItemDto> getRecentApplications(UUID seekerId) {
        Page<Application> page = applicationRepository.findRecentByJobSeekerId(
                seekerId, PageRequest.of(0, 5));

        return page.getContent().stream().map(a -> {
            var job = a.getJob();
            Company company = companyRepository.findById(job.getCompanyId()).orElse(null);
            String companyName = company != null ? company.getName() : "Unknown";

            return JobSeekerApplicationListItemDto.builder()
                    .id(a.getId())
                    .jobTitle(job.getTitle())
                    .jobId(job.getId())
                    .companyName(companyName)
                    .companyInitial(companyName.substring(0, 1).toUpperCase())
                    .aiScore(a.getAiScore())
                    .status(a.getStatus())
                    .appliedAt(a.getCreatedAt())
                    .build();
        }).toList();
    }

    public List<JobSeekerInterviewListItemDto> getUpcomingInterviews(UUID seekerId) {
        Page<Interview> page = interviewRepository.findUpcomingByJobSeekerId(
                seekerId, Instant.now(), PageRequest.of(0, 5));

        return page.getContent().stream().map(i -> {
            var app = i.getApplication();
            var job = app.getJob();
            Company company = companyRepository.findById(job.getCompanyId()).orElse(null);
            String companyName = company != null ? company.getName() : "Unknown";

            return JobSeekerInterviewListItemDto.builder()
                    .id(i.getId())
                    .jobTitle(job.getTitle())
                    .jobId(job.getId())
                    .companyName(companyName)
                    .companyInitial(companyName.substring(0, 1).toUpperCase())
                    .scheduledTime(i.getScheduledTime())
                    .meetingType(i.getMeetingType())
                    .meetingLink(i.getMeetingLink())
                    .status(i.getStatus())
                    .note(i.getNote())
                    .build();
        }).toList();
    }
}
