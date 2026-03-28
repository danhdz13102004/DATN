package com.recruitpro.controller;

import com.recruitpro.dto.response.ApiResponse;
import com.recruitpro.model.Company;
import com.recruitpro.service.CompanyService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * Admin-only company management endpoints under /api/v1/admin/companies.
 */
@RestController
@RequestMapping("/api/v1/admin/companies")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminCompanyController {

    private final CompanyService companyService;

    @PatchMapping("/{id}/verify")
    public ResponseEntity<ApiResponse<Company>> verify(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(companyService.verify(id)));
    }
}
