package com.recruitpro.controller;

import com.recruitpro.dto.response.ApiResponse;
import com.recruitpro.dto.response.JobDetailDto;
import com.recruitpro.dto.response.PaginationMeta;
import com.recruitpro.model.Job;
import com.recruitpro.model.enums.JobStatus;
import com.recruitpro.repository.JobRepository;
import com.recruitpro.service.JobService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/jobs")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminJobController {

    private final JobRepository jobRepository;
    private final JobService jobService;

    @GetMapping
    public ResponseEntity<ApiResponse<Object>> list(
            @RequestParam(required = false) JobStatus status,
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 20) Pageable pageable
    ) {
        Page<Job> page = jobRepository.findAllForAdmin(status, keyword, pageable);
        PaginationMeta meta = PaginationMeta.builder()
                .page(page.getNumber() + 1)
                .pageSize(page.getSize())
                .total(page.getTotalElements())
                .build();
        return ResponseEntity.ok(ApiResponse.ok(page.getContent(), meta));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<JobDetailDto>> getById(@PathVariable java.util.UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(jobService.findByIdAsAdminJobDetailDto(id)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable java.util.UUID id) {
        jobService.deleteByAdmin(id);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
