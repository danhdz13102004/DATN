package com.recruitpro.service;

import com.recruitpro.dto.response.JobDto;
import com.recruitpro.dto.response.JobSelectOptionDto;
import com.recruitpro.exception.ForbiddenException;
import com.recruitpro.exception.ResourceNotFoundException;
import com.recruitpro.model.Job;
import com.recruitpro.model.Skill;
import com.recruitpro.model.enums.ExperienceLevel;
import com.recruitpro.model.enums.JobStatus;
import com.recruitpro.model.enums.JobType;
import com.recruitpro.repository.JobRepository;
import com.recruitpro.repository.SavedJobRepository;
import com.recruitpro.repository.SkillRepository;
import com.recruitpro.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class JobService {

    private final JobRepository jobRepository;
    private final SkillRepository skillRepository;
    private final SavedJobRepository savedJobRepository;
    private final AiServiceClient aiServiceClient;

    /**
     * Public job listing — only shows PUBLISHED jobs.
     */
    public Page<Job> findPublishedJobs(String keyword, JobType jobType,
                                        java.util.Set<ExperienceLevel> experienceLevels,
                                        String location, Pageable pageable) {
        if (experienceLevels != null && !experienceLevels.isEmpty()) {
            return jobRepository.findPublishedJobsWithLevels(keyword, jobType, experienceLevels, location, pageable);
        }
        return jobRepository.findPublishedJobs(keyword, jobType, location, pageable);
    }

    /**
     * Public job listing with isSaved populated for the given job seeker.
     * Pass null seekerId for unauthenticated / non-jobseeker callers.
     */
    public Page<JobDto> findPublishedJobDtos(String keyword, JobType jobType,
                                              Set<ExperienceLevel> experienceLevels,
                                              String location, UUID seekerId, Pageable pageable) {
        Page<Job> page = findPublishedJobs(keyword, jobType, experienceLevels, location, pageable);
        Set<UUID> savedIds = seekerId != null
                ? savedJobRepository.findJobIdsByJobSeekerId(seekerId)
                : Collections.emptySet();
        List<JobDto> dtos = page.getContent().stream()
                .map(j -> toJobDto(j, savedIds.contains(j.getId())))
                .collect(Collectors.toList());
        return new PageImpl<>(dtos, pageable, page.getTotalElements());
    }

    /**
     * Get job by ID with isSaved populated for the given job seeker.
     * Pass null seekerId for unauthenticated / non-jobseeker callers.
     */
    public JobDto findByIdAsDto(UUID id, UUID seekerId) {
        Job job = findById(id);
        boolean saved = seekerId != null && savedJobRepository.existsByJobSeekerIdAndJobId(seekerId, id);
        return toJobDto(job, saved);
    }

    private JobDto toJobDto(Job job, boolean isSaved) {
        return JobDto.builder()
                .id(job.getId())
                .companyId(job.getCompanyId())
                .companyAddressId(job.getCompanyAddressId())
                .title(job.getTitle())
                .description(job.getDescription())
                .industry(job.getIndustry())
                .responsibilities(job.getResponsibilities())
                .requirements(job.getRequirements())
                .niceToHaveSkills(job.getNiceToHaveSkills())
                .jobDataStructure(job.getJobDataStructure())
                .experienceLevels(job.getExperienceLevels())
                .location(job.getLocation())
                .salaryMin(job.getSalaryMin())
                .salaryMax(job.getSalaryMax())
                .jobType(job.getJobType())
                .status(job.getStatus())
                .skills(job.getSkills())
                .createdAt(job.getCreatedAt())
                .updatedAt(job.getUpdatedAt())
                .isSaved(isSaved)
                .build();
    }

    /**
     * Get job by ID — public for published jobs.
     */
    public Job findById(UUID id) {
        return jobRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Job not found"));
    }

    /**
     * Batch-fetch jobs by IDs with isSaved populated for the given job seeker.
     * Returns jobs in the same order as jobIds. Skips jobs that don't exist.
     * Pass null seekerId for unauthenticated / non-jobseeker callers.
     */
    public List<JobDto> findByIds(List<UUID> jobIds, UUID seekerId) {
        if (jobIds == null || jobIds.isEmpty()) {
            return List.of();
        }
        List<Job> jobs = jobRepository.findAllById(jobIds);
        Set<UUID> savedIds = seekerId != null
                ? savedJobRepository.findJobIdsByJobSeekerId(seekerId)
                : Collections.emptySet();

        // Preserve AI ordering
        Set<UUID> idSet = new java.util.LinkedHashSet<>(jobIds);
        Map<UUID, JobDto> dtoMap = jobs.stream()
                .collect(Collectors.toMap(Job::getId, j -> toJobDto(j, savedIds.contains(j.getId()))));

        return idSet.stream()
                .filter(dtoMap::containsKey)
                .map(dtoMap::get)
                .collect(Collectors.toList());
    }

    /**
     * List company's own jobs (all statuses).
     */
    public Page<Job> findByCompanyId(UUID companyId, Pageable pageable) {
        return jobRepository.findAllByCompanyId(companyId, pageable);
    }

    /**
     * Create a new job (COMPANY only).
     */
    @Transactional
    public Job create(Job job, Set<UUID> skillIds, UserPrincipal principal) {
        job.setCompanyId(UUID.fromString(principal.getCompanyId()));
        // Status defaults to DRAFT if not explicitly set by the controller
        if (job.getStatus() == null) {
            job.setStatus(JobStatus.DRAFT);
        }

        if (skillIds != null && !skillIds.isEmpty()) {
            Set<Skill> skills = new HashSet<>(skillRepository.findAllById(skillIds));
            job.setSkills(skills);
        }

        String jobText = buildJobText(job);  // also sets job_data_structure
        Job saved = jobRepository.save(job);
        log.info("Job created: {} (companyId={}, status={})", saved.getTitle(), saved.getCompanyId(), saved.getStatus());

        // Async: register job node in AI graph if already published at creation time
        if (saved.getStatus() == JobStatus.PUBLISHED) {
            aiServiceClient.addJobNode(saved.getId(), jobText);
        }

        return saved;
    }

    /**
     * Update a job (COMPANY only — must own the job).
     */
    @Transactional
    public Job update(UUID id, Job updates, Set<UUID> skillIds, UserPrincipal principal) {
        Job job = findById(id);
        verifyCompanyOwnership(job, principal);

        if (updates.getTitle() != null) job.setTitle(updates.getTitle());
        if (updates.getDescription() != null) job.setDescription(updates.getDescription());
        if (updates.getIndustry() != null) job.setIndustry(updates.getIndustry());
        if (updates.getResponsibilities() != null) job.setResponsibilities(updates.getResponsibilities());
        if (updates.getRequirements() != null) job.setRequirements(updates.getRequirements());
        if (updates.getNiceToHaveSkills() != null) job.setNiceToHaveSkills(updates.getNiceToHaveSkills());
        if (updates.getExperienceLevels() != null && !updates.getExperienceLevels().isEmpty())
            job.setExperienceLevels(updates.getExperienceLevels());
        if (updates.getLocation() != null) job.setLocation(updates.getLocation());
        if (updates.getSalaryMin() != null) job.setSalaryMin(updates.getSalaryMin());
        if (updates.getSalaryMax() != null) job.setSalaryMax(updates.getSalaryMax());
        if (updates.getJobType() != null) job.setJobType(updates.getJobType());
        if (updates.getStatus() != null) job.setStatus(updates.getStatus());
        if (updates.getCompanyAddressId() != null) job.setCompanyAddressId(updates.getCompanyAddressId());

        if (skillIds != null) {
            Set<Skill> skills = new HashSet<>(skillRepository.findAllById(skillIds));
            job.setSkills(skills);
        }

        buildJobText(job);  // refresh job_data_structure with latest field values
        return jobRepository.save(job);
    }

    /**
     * Change job status (DRAFT → PUBLISHED → CLOSED).
     */
    @Transactional
    public Job changeStatus(UUID id, JobStatus newStatus, UserPrincipal principal) {
        Job job = findById(id);
        verifyCompanyOwnership(job, principal);

        job.setStatus(newStatus);
        log.info("Job status changed: {} → {} (id={})", job.getStatus(), newStatus, id);
        Job saved = jobRepository.save(job);

        // Async: register job node in AI graph when first published
        if (newStatus == JobStatus.PUBLISHED) {
            aiServiceClient.addJobNode(saved.getId(), buildJobText(saved));
        }

        return saved;
    }

    /**
     * Soft-delete a job.
     */
    @Transactional
    public void delete(UUID id, UserPrincipal principal) {
        Job job = findById(id);
        verifyCompanyOwnership(job, principal);

        job.setDeletedAt(Instant.now());
        jobRepository.save(job);
        log.info("Job soft-deleted: {} (id={})", job.getTitle(), id);
    }

    /**
     * Lightweight job list for filter dropdowns.
     */
    public List<JobSelectOptionDto> getSelectOptions(UUID companyId) {
        return jobRepository.findSelectOptionsByCompanyId(companyId).stream()
                .map(j -> JobSelectOptionDto.builder()
                        .id(j.getId().toString())
                        .title(j.getTitle())
                        .build())
                .toList();
    }

    private void verifyCompanyOwnership(Job job, UserPrincipal principal) {
        if (principal.getCompanyId() == null ||
            !job.getCompanyId().toString().equals(principal.getCompanyId())) {
            throw new ForbiddenException("You do not have permission to manage this job");
        }
    }

    /**
     * Builds the job_data_structure JSON and returns the combined text for AI embedding.
     * Structure mirrors the Python text-building logic used by the AI service.
     */
    private String buildJobText(Job job) {
        String seniority = (job.getExperienceLevels() != null && !job.getExperienceLevels().isEmpty())
                ? job.getExperienceLevels().stream().map(ExperienceLevel::name).collect(Collectors.joining(", "))
                : "";
        String mustHaveSkills = (job.getSkills() != null && !job.getSkills().isEmpty())
                ? job.getSkills().stream().map(Skill::getName).collect(Collectors.joining(", "))
                : "";
        String niceToHaveSkills = (job.getNiceToHaveSkills() != null && job.getNiceToHaveSkills().length > 0)
                ? String.join(", ", job.getNiceToHaveSkills())
                : "";
        String responsibilities = (job.getResponsibilities() != null && job.getResponsibilities().length > 0)
                ? String.join(". ", job.getResponsibilities())
                : "";
        String requirements = (job.getRequirements() != null && job.getRequirements().length > 0)
                ? String.join(". ", job.getRequirements())
                : "";
        String industryName = (job.getIndustry() != null) ? job.getIndustry().getName() : "";

        String text = "Job Title: " + safeText(job.getTitle()) + ". " +
                "Seniority: " + safeText(seniority) + ". " +
                "Industry: " + safeText(industryName) + ". " +
                "Must-have Skills: " + safeText(mustHaveSkills) + ". " +
                "Nice-to-have Skills: " + safeText(niceToHaveSkills) + ". " +
                "Description: " + safeText(job.getDescription()) + ". " +
                "Responsibilities: " + safeText(responsibilities) + ". " +
                "Requirements: " + safeText(requirements);

        Map<String, Object> dataStructure = new LinkedHashMap<>();
        dataStructure.put("job_title", safeText(job.getTitle()));
        dataStructure.put("seniority", safeText(seniority));
        dataStructure.put("industry", safeText(industryName));
        dataStructure.put("must_have_skills", safeText(mustHaveSkills));
        dataStructure.put("nice_to_have_skills", safeText(niceToHaveSkills));
        dataStructure.put("description", safeText(job.getDescription()));
        dataStructure.put("responsibilities", safeText(responsibilities));
        dataStructure.put("requirements", safeText(requirements));
        dataStructure.put("text", text);
        job.setJobDataStructure(dataStructure);

        return text;
    }

    private String safeText(String s) {
        return (s != null && !s.isBlank()) ? s : "";
    }
}
