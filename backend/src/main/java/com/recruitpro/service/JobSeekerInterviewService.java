package com.recruitpro.service;

import com.recruitpro.dto.response.JobSeekerInterviewListItemDto;
import com.recruitpro.dto.response.JobSeekerInterviewStatsDto;
import com.recruitpro.model.Company;
import com.recruitpro.model.Interview;
import com.recruitpro.model.enums.InterviewStatus;
import com.recruitpro.model.enums.MeetingType;
import com.recruitpro.repository.CompanyRepository;
import com.recruitpro.repository.InterviewRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class JobSeekerInterviewService {

    private final InterviewRepository interviewRepository;
    private final CompanyRepository companyRepository;

    public Page<JobSeekerInterviewListItemDto> listForSeeker(
            UUID seekerId, InterviewStatus status, MeetingType meetingType, Pageable pageable) {

        Page<Interview> page = interviewRepository.findByJobSeekerIdAndFilters(
                seekerId, status, meetingType, pageable);

        return page.map(i -> {
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
        });
    }

    public JobSeekerInterviewStatsDto getStats(UUID seekerId) {
        return JobSeekerInterviewStatsDto.builder()
                .upcoming(interviewRepository.countByJobSeekerIdAndStatus(seekerId, InterviewStatus.PENDING))
                .completed(interviewRepository.countByJobSeekerIdAndStatus(seekerId, InterviewStatus.COMPLETED))
                .cancelled(interviewRepository.countByJobSeekerIdAndStatus(seekerId, InterviewStatus.CANCELLED))
                .build();
    }
}
