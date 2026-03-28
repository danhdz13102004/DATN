package com.recruitpro.service;

import com.recruitpro.dto.response.JobSelectOptionDto;
import com.recruitpro.exception.ForbiddenException;
import com.recruitpro.exception.ResourceNotFoundException;
import com.recruitpro.model.Job;
import com.recruitpro.model.Skill;
import com.recruitpro.model.enums.ExperienceLevel;
import com.recruitpro.model.enums.JobStatus;
import com.recruitpro.model.enums.JobType;
import com.recruitpro.repository.JobRepository;
import com.recruitpro.repository.SkillRepository;
import com.recruitpro.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class JobService {

    private final JobRepository jobRepository;
    private final SkillRepository skillRepository;

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
     * Get job by ID — public for published jobs.
     */
    public Job findById(UUID id) {
        return jobRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Job not found"));
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

        Job saved = jobRepository.save(job);
        log.info("Job created: {} (companyId={}, status={})", saved.getTitle(), saved.getCompanyId(), saved.getStatus());
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
        return jobRepository.save(job);
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
}
