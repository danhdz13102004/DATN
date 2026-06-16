package com.recruitpro.service;

import com.recruitpro.dto.response.JobSeekerApplicationDetailDto;
import com.recruitpro.dto.response.JobSeekerApplicationListItemDto;
import com.recruitpro.dto.response.JobSeekerApplicationStatsDto;
import com.recruitpro.exception.BadRequestException;
import com.recruitpro.exception.ForbiddenException;
import com.recruitpro.exception.ResourceNotFoundException;
import com.recruitpro.model.Application;
import com.recruitpro.model.Company;
import com.recruitpro.model.Interview;
import com.recruitpro.model.Job;
import com.recruitpro.model.JobSeeker;
import com.recruitpro.model.Resume;
import com.recruitpro.model.User;
import com.recruitpro.model.enums.ApplicationStatus;
import com.recruitpro.model.enums.InteractionEventType;
import com.recruitpro.model.enums.NotificationType;
import com.recruitpro.repository.ApplicationRepository;
import com.recruitpro.repository.CompanyRepository;
import com.recruitpro.repository.InterviewRepository;
import com.recruitpro.repository.JobSeekerRepository;
import com.recruitpro.repository.JobRepository;
import com.recruitpro.repository.ResumeRepository;
import com.recruitpro.repository.StaffRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class JobSeekerApplicationService {

    private final ApplicationRepository applicationRepository;
    private final JobRepository jobRepository;
    private final ResumeRepository resumeRepository;
    private final CompanyRepository companyRepository;
    private final InterviewRepository interviewRepository;
    private final JobSeekerRepository jobSeekerRepository;
    private final StaffRepository staffRepository;
    private final AiServiceClient aiServiceClient;
    private final JobInteractionService jobInteractionService;
    private final NotificationService notificationService;

    public Page<JobSeekerApplicationListItemDto> listForSeeker(
            UUID seekerId, ApplicationStatus status, String search, Pageable pageable) {

        Page<Application> page = applicationRepository.findByJobSeekerIdFilters(
                seekerId, status, search, pageable);

        return page.map(a -> {
            Job job = a.getJob();
            Company company = companyRepository.findById(job.getCompanyId()).orElse(null);
            String companyName = company != null ? company.getName() : "Unknown";
            String initial = companyName.substring(0, 1).toUpperCase();

            return JobSeekerApplicationListItemDto.builder()
                    .id(a.getId())
                    .jobTitle(job.getTitle())
                    .jobId(job.getId())
                    .companyName(companyName)
                    .companyInitial(initial)
                    .aiScore(a.getAiScore())
                    .status(a.getStatus())
                    .appliedAt(a.getCreatedAt())
                    .build();
        });
    }

    public JobSeekerApplicationStatsDto getStats(UUID seekerId) {
        return JobSeekerApplicationStatsDto.builder()
                .totalApplied(applicationRepository.countByJobSeekerId(seekerId))
                .inScreening(applicationRepository.countByJobSeekerIdAndStatus(seekerId, ApplicationStatus.SCREENING))
                .inInterview(applicationRepository.countByJobSeekerIdAndStatus(seekerId, ApplicationStatus.INTERVIEW))
                .offers(applicationRepository.countByJobSeekerIdAndStatus(seekerId, ApplicationStatus.OFFER))
                .build();
    }

    public JobSeekerApplicationDetailDto getDetail(UUID applicationId, UUID seekerId) {
        Application app = applicationRepository.findDetailByIdAndJobSeekerId(applicationId, seekerId)
                .orElseThrow(() -> new ResourceNotFoundException("Application not found"));

        Job job = app.getJob();
        Company company = companyRepository.findById(job.getCompanyId()).orElse(null);
        String companyName = company != null ? company.getName() : "Unknown";

        // Get resume label
        String resumeLabel = null;
        if (app.getResumeId() != null) {
            Resume resume = resumeRepository.findById(app.getResumeId()).orElse(null);
            resumeLabel = resume != null ? resume.getLabel() : null;
        }

        // Get interview if exists
        Interview interview = null;
        if (applicationRepository.hasScheduledInterview(app.getId())) {
            // Get latest interview for this application
            Page<Interview> interviews = interviewRepository.findByJobSeekerIdAndFilters(
                    seekerId, null, null, PageRequest.of(0, 1));
            if (!interviews.isEmpty()) {
                interview = interviews.getContent().stream()
                        .filter(i -> i.getApplicationId().equals(app.getId()))
                        .findFirst().orElse(null);
            }
        }

        // Build history
        List<JobSeekerApplicationDetailDto.HistoryEntry> history = new ArrayList<>();
        history.add(JobSeekerApplicationDetailDto.HistoryEntry.builder()
                .date(app.getCreatedAt())
                .event("Application Submitted")
                .details("Applied with " + (resumeLabel != null ? resumeLabel : "resume"))
                .build());

        if (app.getStatus().ordinal() >= ApplicationStatus.SCREENING.ordinal()) {
            history.add(JobSeekerApplicationDetailDto.HistoryEntry.builder()
                    .date(app.getUpdatedAt() != null ? app.getUpdatedAt() : app.getCreatedAt())
                    .event("Screening Passed")
                    .details("Your resume passed the initial screening process")
                    .build());
        }

        if (interview != null) {
            history.add(JobSeekerApplicationDetailDto.HistoryEntry.builder()
                    .date(interview.getCreatedAt())
                    .event("Interview Scheduled")
                    .details("Interview scheduled for " + interview.getScheduledTime())
                    .build());
        }

        // Sort history by date descending
        history.sort((a1, b1) -> b1.getDate().compareTo(a1.getDate()));

        Set<String> experienceLevels = job.getExperienceLevels() != null
                ? job.getExperienceLevels().stream().map(Enum::name).collect(Collectors.toSet())
                : Set.of();

        Set<String> skills = job.getSkills() != null
                ? job.getSkills().stream().map(s -> s.getName()).collect(Collectors.toSet())
                : Set.of();

        var builder = JobSeekerApplicationDetailDto.builder()
                .id(app.getId())
                .status(app.getStatus())
                .aiScore(app.getAiScore())
                .jsonMatching(app.getJsonMatching())
                .coverLetter(app.getCoverLetter())
                .appliedAt(app.getCreatedAt())
                .jobId(job.getId())
                .jobTitle(job.getTitle())
                .companyName(companyName)
                .companyInitial(companyName.substring(0, 1).toUpperCase())
                .location(job.getLocation())
                .jobType(job.getJobType() != null ? job.getJobType().name() : null)
                .salaryMin(job.getSalaryMin())
                .salaryMax(job.getSalaryMax())
                .experienceLevels(experienceLevels)
                .skills(skills)
                .resumeId(app.getResumeId())
                .resumeLabel(resumeLabel)
                .history(history);

        if (interview != null) {
            builder.interviewId(interview.getId())
                    .interviewScheduledTime(interview.getScheduledTime())
                    .interviewMeetingType(interview.getMeetingType())
                    .interviewMeetingLink(interview.getMeetingLink())
                    .interviewStatus(interview.getStatus())
                    .interviewNote(interview.getNote());
        }

        return builder.build();
    }

    @Transactional
    public Application apply(UUID seekerId, UUID jobId, UUID resumeId, String coverLetter) {
        // Validate job exists and is published
        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Job not found"));

        if (job.getStatus() != com.recruitpro.model.enums.JobStatus.PUBLISHED) {
            throw new BadRequestException("This job is not accepting applications");
        }

        // Check duplicate
        if (applicationRepository.existsByJobIdAndJobSeekerIdAndDeletedAtIsNull(jobId, seekerId)) {
            throw new BadRequestException("You have already applied to this job");
        }

        // Validate resume ownership
        Resume resume = resumeRepository.findById(resumeId)
                .orElseThrow(() -> new ResourceNotFoundException("Resume not found"));
        if (!resume.getJobSeekerId().equals(seekerId)) {
            throw new ForbiddenException("You do not own this resume");
        }

        Application application = Application.builder()
                .jobId(jobId)
                .jobSeekerId(seekerId)
                .resumeId(resumeId)
                .coverLetter(coverLetter)
                .status(ApplicationStatus.APPLIED)
                .build();

        Application saved = applicationRepository.save(application);
        log.info("Job seeker {} applied to job {} with resume {}", seekerId, jobId, resumeId);

        notifyCompanyStaff(saved, job, seekerId);

        // Log apply interaction for behavioral tracking + AI sync
        // Apply events use explicit single resume with weight = 1.0 (ground truth)
        jobInteractionService.logWithSingleResume(seekerId, jobId, InteractionEventType.apply, resumeId, null);

        // Async: register application edge in AI graph (resume → job)
        aiServiceClient.registerApplication(resumeId, jobId);

        // Async: compute AI matching score if resume has structured data
        if (resume.getResumeDataStructure() != null) {
            aiServiceClient.matchApplication(saved.getId(), resume.getResumeDataStructure(), job);
        } else {
            log.info("Skipping AI match for application {} — resume {} has no structured data",
                    saved.getId(), resumeId);
        }

        return saved;
    }

    @Transactional
    public void withdraw(UUID applicationId, UUID seekerId) {
        Application app = applicationRepository.findDetailByIdAndJobSeekerId(applicationId, seekerId)
                .orElseThrow(() -> new ResourceNotFoundException("Application not found"));

        if (app.getStatus() == ApplicationStatus.WITHDRAWN) {
            throw new BadRequestException("Application already withdrawn");
        }
        if (app.getStatus() == ApplicationStatus.HIRED) {
            throw new BadRequestException("Cannot withdraw a hired application");
        }

        app.setStatus(ApplicationStatus.WITHDRAWN);
        applicationRepository.save(app);
        log.info("Job seeker {} withdrew application {}", seekerId, applicationId);
    }

    public List<UUID> findAppliedJobIds(UUID seekerId) {
        return applicationRepository.findAppliedJobIdsByJobSeekerId(seekerId);
    }

    private void notifyCompanyStaff(Application application, Job job, UUID seekerId) {
        JobSeeker jobSeeker = jobSeekerRepository.findById(seekerId).orElse(null);
        User user = jobSeeker != null ? jobSeeker.getUser() : null;
        String applicantName = getApplicantName(user);
        String applicantEmail = user != null && user.getEmail() != null ? user.getEmail() : "Unknown";

        staffRepository.findAllByCompanyId(job.getCompanyId()).forEach(staff -> {
            if (staff.getUser() != null && staff.getUser().getId() != null) {
                notificationService.createAndPublish(
                        staff.getUser().getId(),
                        NotificationType.JOB_APPLIED,
                        "New job application",
                        applicantName + " (" + applicantEmail + ") applied for \"" + job.getTitle() + "\".",
                        application.getId(),
                        "APPLICATION"
                );
            }
        });
    }

    private String getApplicantName(User user) {
        if (user == null) {
            return "Unknown";
        }
        if (user.getFullName() != null && !user.getFullName().isBlank()) {
            return user.getFullName();
        }
        return user.getEmail() != null ? user.getEmail() : "Unknown";
    }
}
