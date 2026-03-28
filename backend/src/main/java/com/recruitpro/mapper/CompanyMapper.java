package com.recruitpro.mapper;

import com.recruitpro.dto.response.CompanyResponseDto;
import com.recruitpro.model.Company;
import com.recruitpro.storage.StorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Maps Company entities to Response DTOs.
 * Uses StorageService to correctly format MinIO public URLs.
 */
@Component
@RequiredArgsConstructor
public class CompanyMapper {

    private final StorageService storageService;

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
                .build();
    }
}
