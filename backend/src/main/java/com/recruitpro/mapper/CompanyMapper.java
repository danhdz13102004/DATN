package com.recruitpro.mapper;

import com.recruitpro.dto.response.CompanyResponseDto;
import com.recruitpro.model.Company;
import com.recruitpro.model.enums.JobStatus;
import com.recruitpro.repository.JobRepository;
import com.recruitpro.repository.StaffRepository;
import com.recruitpro.storage.StorageService;
import lombok.RequiredArgsConstructor;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

/**
 * Maps Company entities to Response DTOs.
 * Uses StorageService to correctly format MinIO public URLs.
 */
@Component
@RequiredArgsConstructor
public class CompanyMapper {

    private final StorageService storageService;
    private final StaffRepository staffRepository;
    private final JobRepository jobRepository;

    public CompanyResponseDto toDto(Company company) {
        if (company == null) {
            return null;
        }

        return CompanyResponseDto.builder()
                .id(company.getId())
                .name(company.getName())
                .description(company.getDescription())
                .website(company.getWebsite())
                .logoUrl(storageService.getPublicUrl(company.getLogoUrl()))
                .verified(company.isVerified())
                .blocked(company.isBlocked())
                .createdAt(company.getCreatedAt())
                .staffCount(staffRepository.countByCompanyId(company.getId()))
                .activeJobsCount(jobRepository.countByCompanyIdAndStatus(company.getId(), JobStatus.PUBLISHED))
                .build();
    }

    public List<CompanyResponseDto> toDtoList(List<Company> companies) {
        return companies.stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }
}
