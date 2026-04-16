package com.recruitpro.controller;

import com.recruitpro.dto.response.ApiResponse;
import com.recruitpro.dto.response.PaginationMeta;
import com.recruitpro.model.Application;
import com.recruitpro.model.enums.ApplicationStatus;
import com.recruitpro.repository.ApplicationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/applications")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminApplicationController {

    private final ApplicationRepository applicationRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<Object>> list(
            @RequestParam(required = false) ApplicationStatus status,
            @RequestParam(required = false) String search,
            @PageableDefault(size = 20) Pageable pageable
    ) {
        Page<Application> page = applicationRepository.findAllForAdmin(status, search, pageable);
        PaginationMeta meta = PaginationMeta.builder()
                .page(page.getNumber() + 1)
                .pageSize(page.getSize())
                .total(page.getTotalElements())
                .build();
        return ResponseEntity.ok(ApiResponse.ok(page.getContent(), meta));
    }
}
