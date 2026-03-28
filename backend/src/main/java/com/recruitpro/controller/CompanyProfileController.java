package com.recruitpro.controller;

import com.recruitpro.dto.response.ApiResponse;
import com.recruitpro.dto.response.CompanyResponseDto;
import com.recruitpro.mapper.CompanyMapper;
import com.recruitpro.model.Company;
import com.recruitpro.model.CompanyAddress;
import com.recruitpro.security.UserPrincipal;
import com.recruitpro.service.CompanyService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Company-scoped profile and address management under /api/v1/company.
 */
@RestController
@RequestMapping("/api/v1/company")
@PreAuthorize("hasRole('COMPANY')")
@RequiredArgsConstructor
public class CompanyProfileController {

    private final CompanyService companyService;
    private final CompanyMapper  companyMapper;

    // ── Profile ──────────────────────────────────

    @GetMapping("/profile")
    public ResponseEntity<ApiResponse<CompanyResponseDto>> getProfile(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        UUID companyId = UUID.fromString(principal.getCompanyId());
        Company company = companyService.findById(companyId);
        return ResponseEntity.ok(ApiResponse.ok(companyMapper.toDto(company)));
    }

    @PutMapping("/profile")
    public ResponseEntity<ApiResponse<Company>> updateProfile(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody Map<String, String> body
    ) {
        UUID companyId = UUID.fromString(principal.getCompanyId());
        Company updates = Company.builder()
                .name(body.get("name"))
                .description(body.get("description"))
                .website(body.get("website"))
                .build();
        return ResponseEntity.ok(ApiResponse.ok(companyService.updateProfile(companyId, updates)));
    }

    @PostMapping("/logo")
    public ResponseEntity<ApiResponse<Company>> uploadLogo(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam("file") MultipartFile file
    ) throws IOException {
        UUID companyId = UUID.fromString(principal.getCompanyId());
        return ResponseEntity.ok(ApiResponse.ok(companyService.uploadLogo(companyId, file)));
    }

    // ── Addresses ────────────────────────────────

    @GetMapping("/addresses")
    public ResponseEntity<ApiResponse<List<CompanyAddress>>> listAddresses(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        UUID companyId = UUID.fromString(principal.getCompanyId());
        return ResponseEntity.ok(ApiResponse.ok(companyService.findAddresses(companyId)));
    }

    @PostMapping("/addresses")
    public ResponseEntity<ApiResponse<CompanyAddress>> createAddress(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody CompanyAddress address
    ) {
        UUID companyId = UUID.fromString(principal.getCompanyId());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(companyService.createAddress(companyId, address)));
    }

    @PutMapping("/addresses/{id}")
    public ResponseEntity<ApiResponse<CompanyAddress>> updateAddress(
            @PathVariable UUID id,
            @RequestBody CompanyAddress updates,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(ApiResponse.ok(companyService.updateAddress(id, updates, principal)));
    }

    @DeleteMapping("/addresses/{id}")
    public ResponseEntity<ApiResponse<Map<String, String>>> deleteAddress(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        companyService.deleteAddress(id, principal);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("message", "Address deleted")));
    }

    @PatchMapping("/addresses/{id}/default")
    public ResponseEntity<ApiResponse<CompanyAddress>> setDefaultAddress(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(ApiResponse.ok(companyService.setDefaultAddress(id, principal)));
    }
}
