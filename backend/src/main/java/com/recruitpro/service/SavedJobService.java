package com.recruitpro.service;

import com.recruitpro.exception.ResourceNotFoundException;
import com.recruitpro.model.Company;
import com.recruitpro.model.Job;
import com.recruitpro.model.SavedJob;
import com.recruitpro.dto.response.SavedJobDto;
import com.recruitpro.repository.CompanyRepository;
import com.recruitpro.repository.JobRepository;
import com.recruitpro.repository.SavedJobRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class SavedJobService {

    private final SavedJobRepository savedJobRepository;
    private final JobRepository jobRepository;
    private final CompanyRepository companyRepository;

    /**
     * Save a job for a job seeker. Idempotent — returns existing entry if already saved.
     */
    @Transactional
    public SavedJobDto save(UUID jobSeekerId, UUID jobId) {
        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Job not found"));

        if (savedJobRepository.existsByJobSeekerIdAndJobId(jobSeekerId, jobId)) {
            // Already saved — return current state
            SavedJob existing = savedJobRepository.findByJobSeekerIdAndJobId(jobSeekerId, jobId)
                    .orElseThrow();
            return toDto(existing, job);
        }

        SavedJob saved = savedJobRepository.save(
                SavedJob.builder()
                        .jobSeekerId(jobSeekerId)
                        .jobId(jobId)
                        .build()
        );
        log.info("Job seeker {} saved job {}", jobSeekerId, jobId);
        return toDto(saved, job);
    }

    /**
     * Remove a saved job. Silently succeeds if not saved.
     */
    @Transactional
    public void unsave(UUID jobSeekerId, UUID jobId) {
        savedJobRepository.deleteByJobSeekerIdAndJobId(jobSeekerId, jobId);
        log.info("Job seeker {} unsaved job {}", jobSeekerId, jobId);
    }

    /**
     * List all saved jobs for a seeker, paginated.
     */
    public Page<SavedJobDto> listSaved(UUID jobSeekerId, Pageable pageable) {
        return savedJobRepository.findAllExistingByJobSeekerId(jobSeekerId, pageable)
                .map(savedJob -> toDto(savedJob, jobRepository.findById(savedJob.getJobId()).orElseThrow()));
    }

    /**
     * Check whether a seeker has saved a specific job.
     */
    public boolean isSaved(UUID jobSeekerId, UUID jobId) {
        return savedJobRepository.existsByJobSeekerIdAndJobId(jobSeekerId, jobId);
    }

    private SavedJobDto toDto(SavedJob savedJob, Job job) {
        String companyName = companyRepository.findById(job.getCompanyId())
                .map(Company::getName)
                .orElse("Unknown");

        return SavedJobDto.builder()
                .savedJobId(savedJob.getId())
                .jobId(job.getId())
                .jobTitle(job.getTitle())
                .companyName(companyName)
                .location(job.getLocation())
                .jobType(job.getJobType() != null ? job.getJobType().name() : null)
                .salaryMin(job.getSalaryMin())
                .salaryMax(job.getSalaryMax())
                .savedAt(savedJob.getCreatedAt())
                .isSaved(true)
                .build();
    }
}
