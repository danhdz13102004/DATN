package com.recruitpro.controller;

import com.recruitpro.dto.response.AdminCompanyDetailDto;
import com.recruitpro.dto.response.ApiResponse;
import com.recruitpro.dto.response.PaginationMeta;
import com.recruitpro.mapper.CompanyMapper;
import com.recruitpro.model.Company;
import com.recruitpro.model.Job;
import com.recruitpro.model.Staff;
import com.recruitpro.model.enums.JobStatus;
import com.recruitpro.repository.ApplicationRepository;
import com.recruitpro.repository.CompanyRepository;
import com.recruitpro.repository.JobRepository;
import com.recruitpro.repository.StaffRepository;
import com.recruitpro.service.CompanyService;
import com.recruitpro.storage.StorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Admin-only company management endpoints under /api/v1/admin/companies.
 */
@RestController
@RequestMapping("/api/v1/admin/companies")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminCompanyController {

    private final CompanyService companyService;
    private final CompanyRepository companyRepository;
    private final CompanyMapper companyMapper;
    private final StaffRepository staffRepository;
    private final JobRepository jobRepository;
    private final ApplicationRepository applicationRepository;
    private final StorageService storageService;

    @GetMapping
    public ResponseEntity<ApiResponse<Object>> list(
            @RequestParam(required = false) Boolean verified,
            @PageableDefault(size = 20) Pageable pageable
    ) {
        Page<Company> page = (verified != null)
                ? companyRepository.findAllByVerified(verified, pageable)
                : companyRepository.findAll(pageable);
        PaginationMeta meta = PaginationMeta.builder()
                .page(page.getNumber() + 1)
                .pageSize(page.getSize())
                .total(page.getTotalElements())
                .build();
        return ResponseEntity.ok(ApiResponse.ok(companyMapper.toDtoList(page.getContent()), meta));
    }

    @PatchMapping("/{id}/verify")
    public ResponseEntity<ApiResponse<Company>> verify(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(companyService.verify(id)));
    }

    @PatchMapping("/{id}/block")
    public ResponseEntity<ApiResponse<Company>> block(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(companyService.setBlocked(id, true)));
    }

    @PatchMapping("/{id}/unblock")
    public ResponseEntity<ApiResponse<Company>> unblock(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(companyService.setBlocked(id, false)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<AdminCompanyDetailDto>> getDetail(@PathVariable UUID id) {
        Company company = companyService.findById(id);

        List<Staff> staffList = staffRepository.findAllByCompanyId(id);
        List<AdminCompanyDetailDto.StaffItem> staffItems = staffList.stream()
                .map(s -> AdminCompanyDetailDto.StaffItem.builder()
                        .id(s.getId().toString())
                        .userId(s.getUser().getId().toString())
                        .email(s.getUser().getEmail())
                        .fullName(s.getUser().getFullName())
                        .role(s.getRole().name())
                        .joinedAt(s.getCreatedAt())
                        .build())
                .collect(Collectors.toList());

        List<Job> activeJobs = jobRepository.findTop10ByCompanyIdAndStatusOrderByCreatedAtDesc(id, JobStatus.PUBLISHED);
        List<AdminCompanyDetailDto.JobItem> jobItems = activeJobs.stream()
                .map(j -> AdminCompanyDetailDto.JobItem.builder()
                        .id(j.getId())
                        .title(j.getTitle())
                        .jobType(j.getJobType() != null ? j.getJobType().name() : null)
                        .experienceLevels(j.getExperienceLevels().stream()
                                .map(Enum::name).collect(Collectors.toList()))
                        .status(j.getStatus().name())
                        .applicationCount(applicationRepository.countByJobId(j.getId()))
                        .createdAt(j.getCreatedAt())
                        .build())
                .collect(Collectors.toList());

        AdminCompanyDetailDto detail = AdminCompanyDetailDto.builder()
                .id(company.getId())
                .name(company.getName())
                .description(company.getDescription())
                .website(company.getWebsite())
                .logoUrl(storageService.getPublicUrl(company.getLogoUrl()))
                .verified(company.isVerified())
                .blocked(company.isBlocked())
                .createdAt(company.getCreatedAt())
                .updatedAt(company.getUpdatedAt())
                .staff(staffItems)
                .activeJobs(jobItems)
                .totalStaff(staffList.size())
                .totalActiveJobs(jobRepository.countByCompanyIdAndStatus(id, JobStatus.PUBLISHED))
                .build();

        return ResponseEntity.ok(ApiResponse.ok(detail));
    }
}
