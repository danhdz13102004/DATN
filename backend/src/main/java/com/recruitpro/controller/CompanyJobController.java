package com.recruitpro.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.recruitpro.dto.JobAutoFillDto;
import com.recruitpro.dto.request.JobCreateRequest;
import com.recruitpro.dto.request.JobUpdateRequest;
import com.recruitpro.dto.response.ApiResponse;
import com.recruitpro.dto.response.JobSelectOptionDto;
import com.recruitpro.dto.response.PaginationMeta;
import com.recruitpro.exception.BadRequestException;
import com.recruitpro.model.Job;
import com.recruitpro.model.enums.ExperienceLevel;
import com.recruitpro.model.enums.JobStatus;
import com.recruitpro.model.enums.JobType;
import com.recruitpro.repository.IndustryRepository;
import com.recruitpro.security.UserPrincipal;
import com.recruitpro.service.CompanySubscriptionService;
import com.recruitpro.service.JobAutoFillService;
import com.recruitpro.service.JobService;
import com.recruitpro.storage.StorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Company-scoped job management endpoints under /api/v1/company/jobs.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/company/jobs")
@PreAuthorize("hasRole('COMPANY')")
@RequiredArgsConstructor
public class CompanyJobController {

    private final JobService jobService;
    private final JobAutoFillService jobAutoFillService;
    private final IndustryRepository industryRepository;
    private final CompanySubscriptionService subscriptionService;
    private final StorageService storageService;
    private final ObjectMapper objectMapper;

    @GetMapping
    public ResponseEntity<ApiResponse<Object>> listCompanyJobs(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) JobStatus status,
            @RequestParam(required = false) JobType type,
            @RequestParam(required = false) ExperienceLevel level,
            @RequestParam(required = false) String search,
            @PageableDefault(size = 20) Pageable pageable
    ) {
        UUID companyId = UUID.fromString(principal.getCompanyId());
        Page<Job> page = jobService.findByCompanyId(companyId, status, type, level, search, pageable);
        PaginationMeta meta = PaginationMeta.builder()
                .page(page.getNumber() + 1)
                .pageSize(page.getSize())
                .total(page.getTotalElements())
                .build();
        return ResponseEntity.ok(ApiResponse.ok(page.getContent(), meta));
    }

    /** JSON-only request (no file attachment). */
    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ApiResponse<Job>> createJson(
            @RequestBody JobCreateRequest body,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Job job = mapToJob(body);
        Job created = jobService.create(job, body.skillIds(), principal, null);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(created));
    }

    /** Multipart request (with optional file attachment). */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<Job>> createMultipart(
            @RequestParam("data") String dataJson,
            @RequestParam(value = "attachment", required = false) MultipartFile attachment,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Map<String, Object> body;
        try {
            body = objectMapper.readValue(dataJson, new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            throw new BadRequestException("Invalid JSON data");
        }

        Job job = mapToJob(body);
        Set<UUID> skillIds = body.get("skillIds") != null ? parseSkillIds(body.get("skillIds")) : null;
        String attachmentUrl = uploadAttachmentIfPresent(attachment);
        Job created = jobService.create(job, skillIds, principal, attachmentUrl);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(created));
    }

    /** JSON-only update. */
    @PutMapping(value = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ApiResponse<Job>> updateJson(
            @PathVariable UUID id,
            @RequestBody JobUpdateRequest body,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Job updated = jobService.update(id, mapToJob(body), body.skillIds(), principal, null);
        return ResponseEntity.ok(ApiResponse.ok(updated));
    }

    /** Multipart update (with optional file attachment). */
    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<Job>> updateMultipart(
            @PathVariable UUID id,
            @RequestParam("data") String dataJson,
            @RequestParam(value = "attachment", required = false) MultipartFile attachment,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Map<String, Object> body;
        try {
            body = objectMapper.readValue(dataJson, new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            throw new BadRequestException("Invalid JSON data");
        }

        Job updates = mapToJob(body);
        Set<UUID> skillIds = body.get("skillIds") != null ? parseSkillIds(body.get("skillIds")) : null;
        String attachmentUrl = uploadAttachmentIfPresent(attachment);
        Job updated = jobService.update(id, updates, skillIds, principal, attachmentUrl);
        return ResponseEntity.ok(ApiResponse.ok(updated));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<Job>> changeStatus(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        JobStatus status = JobStatus.valueOf(body.get("status"));
        return ResponseEntity.ok(ApiResponse.ok(jobService.changeStatus(id, status, principal)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Map<String, String>>> delete(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        jobService.delete(id, principal);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("message", "Job deleted")));
    }

    @GetMapping("/select-options")
    public ResponseEntity<ApiResponse<List<JobSelectOptionDto>>> getSelectOptions(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        UUID companyId = UUID.fromString(principal.getCompanyId());
        return ResponseEntity.ok(ApiResponse.ok(jobService.getSelectOptions(companyId)));
    }

    /**
     * Auto-fills job form fields from an uploaded file (PDF or image).
     * The file is sent through OCR then OpenAI structured extraction.
     * Requires the company to have an active subscription with remaining auto-fill uses.
     */
    @PostMapping("/auto-fill")
    public ResponseEntity<ApiResponse<JobAutoFillDto>> autoFillFromFile(
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        UUID companyId = UUID.fromString(principal.getCompanyId());

        if (!subscriptionService.canUseAutoFill(companyId)) {
            throw new BadRequestException("Auto-fill usage limit reached. Please upgrade your plan to continue using this feature.");
        }

        log.info("[CompanyJob] Auto-fill request: filename={}, size={}, contentType={}",
                 file.getOriginalFilename(), file.getSize(), file.getContentType());

        JobAutoFillDto dto = jobAutoFillService.autoFill(file);

        subscriptionService.incrementAutoFillUsage(companyId);

        return ResponseEntity.ok(ApiResponse.ok(dto));
    }

    // ─── Helpers ────────────────────────────────────────────────────────────────

    private Job mapToJob(JobCreateRequest body) {
        Job job = Job.builder()
                .title(body.title())
                .description(body.description())
                .responsibilities(body.responsibilities())
                .requirements(body.requirements())
                .niceToHaveSkills(body.niceToHaveSkills())
                .location(body.location())
                .salaryMin(body.salaryMin())
                .salaryMax(body.salaryMax())
                .jobType(body.jobType())
                .status(body.status() != null ? body.status() : JobStatus.DRAFT)
                .build();

        if (body.industryId() != null && !body.industryId().isBlank()) {
            industryRepository.findById(UUID.fromString(body.industryId()))
                    .ifPresent(job::setIndustry);
        }

        if (body.addressId() != null && !body.addressId().isBlank()) {
            job.setCompanyAddressId(UUID.fromString(body.addressId()));
        }

        if (body.levels() != null) {
            job.setExperienceLevels(body.levels());
        }

        return job;
    }

    private Job mapToJob(JobUpdateRequest body) {
        Job job = Job.builder()
                .title(body.title())
                .description(body.description())
                .responsibilities(body.responsibilities())
                .requirements(body.requirements())
                .niceToHaveSkills(body.niceToHaveSkills())
                .location(body.location())
                .salaryMin(body.salaryMin())
                .salaryMax(body.salaryMax())
                .jobType(body.jobType())
                .status(body.status())
                .build();

        if (body.industryId() != null && !body.industryId().isBlank()) {
            industryRepository.findById(UUID.fromString(body.industryId()))
                    .ifPresent(job::setIndustry);
        }

        if (body.addressId() != null && !body.addressId().isBlank()) {
            job.setCompanyAddressId(UUID.fromString(body.addressId()));
        }

        if (body.levels() != null) {
            job.setExperienceLevels(body.levels());
        }

        return job;
    }

    /** Maps from a Map (multipart JSON) — used by createMultipart and updateMultipart. */
    @SuppressWarnings("unchecked")
    private Job mapToJob(Map<String, Object> body) {
        JobStatus status = body.get("status") != null
                ? JobStatus.valueOf((String) body.get("status"))
                : JobStatus.DRAFT;

        Job job = Job.builder()
                .title((String) body.get("title"))
                .description((String) body.get("description"))
                .responsibilities(getStringArray(body, "responsibilities"))
                .requirements(getStringArray(body, "requirements"))
                .niceToHaveSkills(getStringArray(body, "niceToHaveSkills"))
                .location((String) body.get("location"))
                .salaryMin(body.get("salaryMin") != null ? ((Number) body.get("salaryMin")).intValue() : null)
                .salaryMax(body.get("salaryMax") != null ? ((Number) body.get("salaryMax")).intValue() : null)
                .jobType(body.get("jobType") != null ? JobType.valueOf((String) body.get("jobType")) : null)
                .status(status)
                .build();

        Object addressIdRaw = body.get("addressId");
        if (addressIdRaw != null && !((String) addressIdRaw).isBlank()) {
            job.setCompanyAddressId(UUID.fromString((String) addressIdRaw));
        }

        Object industryIdRaw = body.get("industryId");
        if (industryIdRaw != null && !((String) industryIdRaw).isBlank()) {
            industryRepository.findById(UUID.fromString((String) industryIdRaw))
                    .ifPresent(job::setIndustry);
        }

        Object levelsRaw = body.get("levels");
        if (levelsRaw != null) {
            Set<ExperienceLevel> levels = ((List<String>) levelsRaw).stream()
                    .map(ExperienceLevel::valueOf)
                    .collect(java.util.stream.Collectors.toSet());
            job.setExperienceLevels(levels);
        }

        return job;
    }

    @SuppressWarnings("unchecked")
    private Set<UUID> parseSkillIds(Object raw) {
        if (raw == null) return null;
        return Set.copyOf(
                ((List<String>) raw).stream()
                        .map(UUID::fromString)
                        .toList()
        );
    }

    @SuppressWarnings("unchecked")
    private String[] getStringArray(Map<String, Object> body, String key) {
        Object val = body.get(key);
        if (val == null) return null;
        return ((List<String>) val).toArray(new String[0]);
    }

    /**
     * Upload the attachment file to storage and return the public URL.
     * Returns null if no file is present.
     */
    private String uploadAttachmentIfPresent(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return null;
        }
        try {
            String key = storageService.upload(
                    "job-attachments",
                    file.getOriginalFilename(),
                    file.getInputStream(),
                    file.getSize(),
                    file.getContentType()
            );
            log.info("[CompanyJob] Attachment uploaded: key={}, size={}", key, file.getSize());
            return storageService.getPublicUrl(key);
        } catch (java.io.IOException e) {
            log.error("[CompanyJob] Failed to upload attachment", e);
            throw new BadRequestException("Failed to upload attachment file");
        }
    }
}
