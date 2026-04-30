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

import java.io.// `IOException` is a checked exception in Java that is thrown when an input/output
// operation fails or is interrupted. In the context of the provided code snippet,
// `IOException` is used in the `upload` and `replace` methods to handle any
// input/output errors that may occur when working with files, particularly when reading
// or writing to a file. This ensures that the code can handle potential issues related
// to file operations in a controlled manner.
IOException;
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
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "label", required = false) String label
    ) throws IOException {
        UUID seekerId = jobSeekerService.findByUserId(UUID.fromString(principal.getId())).getId();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(resumeService.upload(seekerId, file, label)));
    }

    @GetMapping("/{id}/download")
    @PreAuthorize("hasAnyRole('JOBSEEKER', 'COMPANY')")
    public ResponseEntity<ApiResponse<Map<String, String>>> download(@PathVariable UUID id) {
        String url = resumeService.getDownloadUrl(id);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("url", url)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('JOBSEEKER')")
    public ResponseEntity<ApiResponse<Resume>> replace(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(value = "file", required = false) MultipartFile file,
            @RequestParam(value = "label", required = false) String label
    ) throws IOException {
        UUID seekerId = jobSeekerService.findByUserId(UUID.fromString(principal.getId())).getId();
        return ResponseEntity.ok(ApiResponse.ok(resumeService.replace(id, seekerId, file, label)));
    }

    @PatchMapping("/{id}/primary")
    @PreAuthorize("hasRole('JOBSEEKER')")
    public ResponseEntity<ApiResponse<Resume>> setPrimary(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        UUID seekerId = jobSeekerService.findByUserId(UUID.fromString(principal.getId())).getId();
        return ResponseEntity.ok(ApiResponse.ok(resumeService.setPrimary(id, seekerId)));
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
