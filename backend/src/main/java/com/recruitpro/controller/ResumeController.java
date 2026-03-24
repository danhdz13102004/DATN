package com.recruitpro.controller;

import com.recruitpro.dto.response.ApiResponse;
import com.recruitpro.model.Resume;
import com.recruitpro.security.UserPrincipal;
import com.recruitpro.service.JobSeekerService;
import com.recruitpro.service.ResumeService;
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

@RestController
@RequestMapping("/api/v1/resumes")
@RequiredArgsConstructor
public class ResumeController {

    private final ResumeService resumeService;
    private final JobSeekerService jobSeekerService;

    @GetMapping
    @PreAuthorize("hasRole('JOBSEEKER')")
    public ResponseEntity<ApiResponse<List<Resume>>> list(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        UUID seekerId = jobSeekerService.findByUserId(UUID.fromString(principal.getId())).getId();
        return ResponseEntity.ok(ApiResponse.ok(resumeService.findByJobSeekerId(seekerId)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('JOBSEEKER', 'COMPANY')")
    public ResponseEntity<ApiResponse<Resume>> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(resumeService.findById(id)));
    }

    @PostMapping
    @PreAuthorize("hasRole('JOBSEEKER')")
    public ResponseEntity<ApiResponse<Resume>> upload(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam("file") MultipartFile file
    ) throws IOException {
        UUID seekerId = jobSeekerService.findByUserId(UUID.fromString(principal.getId())).getId();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(resumeService.upload(seekerId, file)));
    }

    @GetMapping("/{id}/download")
    @PreAuthorize("hasAnyRole('JOBSEEKER', 'COMPANY')")
    public ResponseEntity<ApiResponse<Map<String, String>>> download(@PathVariable UUID id) {
        String url = resumeService.getDownloadUrl(id);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("url", url)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('JOBSEEKER')")
    public ResponseEntity<ApiResponse<Map<String, String>>> delete(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        UUID seekerId = jobSeekerService.findByUserId(UUID.fromString(principal.getId())).getId();
        resumeService.softDelete(id, seekerId);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("message", "Resume deleted")));
    }
}
