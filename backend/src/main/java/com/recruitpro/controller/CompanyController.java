package com.recruitpro.controller;

import com.recruitpro.dto.response.ApiResponse;
import com.recruitpro.dto.response.PaginationMeta;
import com.recruitpro.dto.response.CompanyResponseDto;
import com.recruitpro.mapper.CompanyMapper;
import com.recruitpro.model.Company;
import com.recruitpro.service.CompanyService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * Public company-browsing endpoints (no auth required).
 */
@RestController
@RequestMapping("/api/v1/companies")
@RequiredArgsConstructor
public class CompanyController {

    private final CompanyService companyService;
    private final CompanyMapper companyMapper;

    @GetMapping
    public ResponseEntity<ApiResponse<Object>> list(@PageableDefault(size = 20) Pageable pageable) {
        Page<Company> page = companyService.findAll(pageable);
        
        // Map the entities to custom Response DTOs
        Page<CompanyResponseDto> dtoPage = page.map(companyMapper::toDto);
        
        PaginationMeta meta = PaginationMeta.builder()
                .page(dtoPage.getNumber() + 1)
                .pageSize(dtoPage.getSize())
                .total(dtoPage.getTotalElements())
                .build();
        return ResponseEntity.ok(ApiResponse.ok(dtoPage.getContent(), meta));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<CompanyResponseDto>> getById(@PathVariable UUID id) {
        Company company = companyService.findById(id);
        return ResponseEntity.ok(ApiResponse.ok(companyMapper.toDto(company)));
    }
}
