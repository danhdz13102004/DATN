package com.recruitpro.service;

import com.recruitpro.dto.response.JobDetailDto;
import com.recruitpro.dto.response.JobDto;
import com.recruitpro.dto.response.JobSelectOptionDto;
import com.recruitpro.exception.BadRequestException;
import com.recruitpro.exception.ForbiddenException;
import com.recruitpro.exception.ResourceNotFoundException;
import com.recruitpro.model.Company;
import com.recruitpro.model.CompanyAddress;
import com.recruitpro.model.Job;
import com.recruitpro.model.Skill;
import com.recruitpro.model.enums.ExperienceLevel;
import com.recruitpro.model.enums.JobStatus;
import com.recruitpro.model.enums.JobType;
import com.recruitpro.model.enums.NotificationType;
import com.recruitpro.repository.*;
import com.recruitpro.security.UserPrincipal;
import com.recruitpro.storage.StorageService;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Root;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
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
    private final CompanyRepository companyRepository;
    private final CompanyAddressRepository companyAddressRepository;
    private final StaffRepository staffRepository;
    private final StorageService storageService;
    private final NotificationService notificationService;

    /**
     * Public job listing — only shows PUBLISHED jobs.
     */
    public Page<Job> findPublishedJobs(String keyword, JobType jobType,
                                        Set<ExperienceLevel> experienceLevels,
                                        String location, Double salaryMin, Double salaryMax,
                                        Long cityId, Long countryId,
                                        Pageable pageable) {
        if (experienceLevels != null && !experienceLevels.isEmpty()) {
            return jobRepository.findPublishedJobsWithLevels(keyword, jobType, experienceLevels, location, salaryMin, salaryMax, cityId, countryId, pageable);
        }
        return jobRepository.findPublishedJobs(keyword, jobType, location, salaryMin, salaryMax, cityId, countryId, pageable);
    }

    /**
     * Public job listing with isSaved populated for the given job seeker.
     * Pass null seekerId for unauthenticated / non-jobseeker callers.
     */
    public Page<JobDto> findPublishedJobDtos(String keyword, JobType jobType,
                                              Set<ExperienceLevel> experienceLevels,
                                              String location, Double salaryMin, Double salaryMax,
                                              Long cityId, Long countryId,
                                              UUID seekerId, Pageable pageable) {
        Page<Job> page = findPublishedJobs(keyword, jobType, experienceLevels, location, salaryMin, salaryMax, cityId, countryId, pageable);
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
        Job job = findPublicById(id);
        boolean saved = seekerId != null && savedJobRepository.existsByJobSeekerIdAndJobId(seekerId, id);
        return toJobDto(job, saved);
    }

    /**
     * Get job detail by ID with full company information for the job detail page.
     * Pass null seekerId for unauthenticated / non-jobseeker callers.
     */
    public JobDetailDto findByIdAsJobDetailDto(UUID id, UUID seekerId) {
        Job job = findPublicById(id);
        boolean saved = seekerId != null && savedJobRepository.existsByJobSeekerIdAndJobId(seekerId, id);
        return toJobDetailDto(job, saved);
    }

    /**
     * Admin detail view can inspect any non-deleted job, regardless of publication status.
     */
    public JobDetailDto findByIdAsAdminJobDetailDto(UUID id) {
        return toJobDetailDto(findById(id), false);
    }

    private JobDetailDto toJobDetailDto(Job job, boolean isSaved) {
        // Fetch company info
        JobDetailDto.CompanyDetailDto companyDto = null;
        if (job.getCompanyId() != null) {
            companyDto = companyRepository.findById(job.getCompanyId()).map(company -> {
                // Get company address for location
                String companyLocation = job.getLocation();
                List<CompanyAddress> addresses = companyAddressRepository.findAllByCompanyId(company.getId());
                if (companyLocation == null && !addresses.isEmpty()) {
                    CompanyAddress defaultAddr = addresses.stream()
                            .filter(CompanyAddress::isDefault)
                            .findFirst()
                            .orElse(addresses.get(0));
                    companyLocation = defaultAddr.getCity() != null ? defaultAddr.getCity() :
                            (defaultAddr.getAddressLine() != null ? defaultAddr.getAddressLine() : null);
                }

                return JobDetailDto.CompanyDetailDto.builder()
                        .id(company.getId())
                        .name(company.getName())
                        .description(company.getDescription())
                        .website(company.getWebsite())
                        .logoUrl(storageService.getPublicUrl(company.getLogoUrl()))
                        .verified(company.isVerified())
                        .location(companyLocation)
                        .industry(job.getIndustry() != null ? job.getIndustry().getName() : null)
                        .staffCount(staffRepository.countByCompanyId(company.getId()))
                        .foundedAt(company.getFoundedAt())
                        .benefits(company.getBenefits())
                        .activeJobsCount(jobRepository.countByCompanyIdAndStatus(company.getId(), JobStatus.PUBLISHED))
                        .build();
            }).orElse(null);
        }

        return JobDetailDto.builder()
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
                .attachmentUrl(storageService.getPublicUrl(job.getAttachmentUrl()))
                .isSaved(isSaved)
                .company(companyDto)
                .build();
    }

    private JobDto toJobDto(Job job, boolean isSaved) {
        // Fetch company name for list view (lightweight lookup)
        String companyName = null;
        if (job.getCompanyId() != null) {
            companyName = companyRepository.findById(job.getCompanyId())
                    .map(Company::getName)
                    .orElse(null);
        }

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
                .attachmentUrl(storageService.getPublicUrl(job.getAttachmentUrl()))
                .companyName(companyName)
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

    private Job findPublicById(UUID id) {
        return jobRepository.findPublicById(id)
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
        List<Job> jobs = jobRepository.findAllPublicByIdIn(jobIds);
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
     * List company's own jobs with optional filters.
     */
    public Page<Job> findByCompanyId(UUID companyId, JobStatus status, JobType jobType,
                                     ExperienceLevel level, String search, Pageable pageable) {
        Specification<Job> spec = Specification.where(hasCompanyId(companyId))
                .and(status != null ? hasStatus(status) : Specification.where(null))
                .and(jobType != null ? hasJobType(jobType) : Specification.where(null))
                .and(level != null ? hasLevel(level) : Specification.where(null))
                .and(search != null && !search.isBlank() ? titleContains(search) : Specification.where(null));
        return jobRepository.findAll(spec, pageable);
    }

    private static Specification<Job> hasCompanyId(UUID companyId) {
        return (Root<Job> root, CriteriaQuery<?> query, CriteriaBuilder cb) -> {
            if (query.getResultType() != Long.class && query.getResultType() != long.class) {
                root.fetch("experienceLevels", JoinType.LEFT);
                root.fetch("skills", JoinType.LEFT);
                query.distinct(true);
            }
            return cb.equal(root.get("companyId"), companyId);
        };
    }

    private static Specification<Job> hasStatus(JobStatus status) {
        return (root, query, cb) -> cb.equal(root.get("status"), status);
    }

    private static Specification<Job> hasJobType(JobType jobType) {
        return (root, query, cb) -> cb.equal(root.get("jobType"), jobType);
    }

    private static Specification<Job> hasLevel(ExperienceLevel level) {
        return (root, query, cb) -> {
            Join<Job, ExperienceLevel> levelJoin = root.join("experienceLevels", JoinType.INNER);
            return cb.equal(levelJoin, level);
        };
    }

    private static Specification<Job> titleContains(String search) {
        return (root, query, cb) -> cb.like(cb.lower(root.get("title")), "%" + search.toLowerCase() + "%");
    }

    /**
     * Create a new job (COMPANY only).
     */
    @Transactional
    public Job create(Job job, Set<UUID> skillIds, UserPrincipal principal, String attachmentUrl) {
        UUID companyId = UUID.fromString(principal.getCompanyId());
        job.setCompanyId(companyId);
        // Status defaults to DRAFT if not explicitly set by the controller
        if (job.getStatus() == null) {
            job.setStatus(JobStatus.DRAFT);
        }
        normalizeAddressLocation(job, companyId);

        if (skillIds != null && !skillIds.isEmpty()) {
            Set<Skill> skills = new HashSet<>(skillRepository.findAllById(skillIds));
            job.setSkills(skills);
        }

        if (attachmentUrl != null) {
            job.setAttachmentUrl(attachmentUrl);
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
    public Job update(UUID id, Job updates, Set<UUID> skillIds, UserPrincipal principal, String attachmentUrl) {
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
        if (updates.getLocation() != null) {
            if (updates.getCompanyAddressId() != null) {
                normalizeAddressLocation(updates, job.getCompanyId());
            }
            job.setLocation(updates.getLocation());
            job.setCompanyAddressId(updates.getCompanyAddressId());
        } else if (updates.getCompanyAddressId() != null) {
            normalizeAddressLocation(updates, job.getCompanyId());
            job.setLocation(updates.getLocation());
            job.setCompanyAddressId(updates.getCompanyAddressId());
        }
        if (updates.getSalaryMin() != null) job.setSalaryMin(updates.getSalaryMin());
        if (updates.getSalaryMax() != null) job.setSalaryMax(updates.getSalaryMax());
        if (updates.getJobType() != null) job.setJobType(updates.getJobType());
        if (updates.getStatus() != null) job.setStatus(updates.getStatus());
        if (attachmentUrl != null) job.setAttachmentUrl(attachmentUrl);

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
     * Soft-delete a job from the admin console and notify all company staff.
     */
    @Transactional
    public void deleteByAdmin(UUID id) {
        Job job = findById(id);
        job.setDeletedAt(Instant.now());
        jobRepository.save(job);

        staffRepository.findAllByCompanyId(job.getCompanyId()).forEach(staff -> {
            if (staff.getUser() != null && staff.getUser().getId() != null) {
                notificationService.createAndPublish(
                        staff.getUser().getId(),
                        NotificationType.JOB_DELETED,
                        "Job removed by admin",
                        "Your job \"" + job.getTitle() + "\" was removed by an administrator.",
                        job.getId(),
                        "JOB"
                );
            }
        });

        log.info("Job soft-deleted by admin: {} (id={})", job.getTitle(), id);
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

    private void normalizeAddressLocation(Job job, UUID companyId) {
        if (job.getCompanyAddressId() == null) {
            return;
        }

        CompanyAddress address = companyAddressRepository.findById(job.getCompanyAddressId())
                .orElseThrow(() -> new BadRequestException("Company address not found"));

        if (!companyId.equals(address.getCompanyId())) {
            throw new BadRequestException("Company address does not belong to this company");
        }

        job.setLocation(formatAddressLocation(address));
    }

    private String formatAddressLocation(CompanyAddress address) {
        List<String> parts = new ArrayList<>();
        if (address.getAddressLine() != null && !address.getAddressLine().isBlank()) {
            parts.add(address.getAddressLine().trim());
        }
        if (address.getCity() != null && !address.getCity().isBlank()) {
            parts.add(address.getCity().trim());
        }
        if (address.getCountry() != null && !address.getCountry().isBlank()) {
            parts.add(address.getCountry().trim());
        }
        if (!parts.isEmpty()) {
            return String.join(", ", parts);
        }
        return address.getLabel();
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
