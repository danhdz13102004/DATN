package com.recruitpro.service;

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
                                        ExperienceLevel experienceLevel,
                                        String location, Pageable pageable) {
        return jobRepository.findPublishedJobs(keyword, jobType, experienceLevel, location, pageable);
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
        job.setStatus(JobStatus.DRAFT);

        if (skillIds != null && !skillIds.isEmpty()) {
            Set<Skill> skills = new HashSet<>(skillRepository.findAllById(skillIds));
            job.setSkills(skills);
        }

        Job saved = jobRepository.save(job);
        log.info("Job created: {} (companyId={})", saved.getTitle(), saved.getCompanyId());
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
        if (updates.getExperienceLevel() != null) job.setExperienceLevel(updates.getExperienceLevel());
        if (updates.getLocation() != null) job.setLocation(updates.getLocation());
        if (updates.getSalaryMin() != null) job.setSalaryMin(updates.getSalaryMin());
        if (updates.getSalaryMax() != null) job.setSalaryMax(updates.getSalaryMax());
        if (updates.getJobType() != null) job.setJobType(updates.getJobType());
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

    private void verifyCompanyOwnership(Job job, UserPrincipal principal) {
        if (principal.getCompanyId() == null ||
            !job.getCompanyId().toString().equals(principal.getCompanyId())) {
            throw new ForbiddenException("You do not have permission to manage this job");
        }
    }
}
