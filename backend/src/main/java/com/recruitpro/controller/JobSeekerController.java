package com.recruitpro.controller;

import com.recruitpro.dto.response.ApiResponse;
import com.recruitpro.model.JobSeeker;
import com.recruitpro.security.UserPrincipal;
import com.recruitpro.service.JobSeekerService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/jobseeker")
@PreAuthorize("hasRole('JOBSEEKER')")
@RequiredArgsConstructor
public class JobSeekerController {

    private final JobSeekerService jobSeekerService;

    @GetMapping("/profile")
    public ResponseEntity<ApiResponse<JobSeeker>> getProfile(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        UUID userId = UUID.fromString(principal.getId());
        return ResponseEntity.ok(ApiResponse.ok(jobSeekerService.findByUserId(userId)));
    }

    @PutMapping("/profile")
    public ResponseEntity<ApiResponse<JobSeeker>> updateProfile(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody Map<String, Object> body
    ) {
        UUID userId = UUID.fromString(principal.getId());
        JobSeeker updates = JobSeeker.builder()
                .bio((String) body.get("bio"))
                .location((String) body.get("location"))
                .experienceYears(body.get("experienceYears") != null
                        ? (Integer) body.get("experienceYears") : null)
                .build();
        return ResponseEntity.ok(ApiResponse.ok(jobSeekerService.updateProfile(userId, updates)));
    }

    @PostMapping("/avatar")
    public ResponseEntity<ApiResponse<JobSeeker>> uploadAvatar(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam("file") MultipartFile file
    ) throws IOException {
        UUID userId = UUID.fromString(principal.getId());
        return ResponseEntity.ok(ApiResponse.ok(jobSeekerService.uploadAvatar(userId, file)));
    }
}
