package com.recruitpro.controller;

import com.recruitpro.dto.request.LogInteractionRequestDto;
import com.recruitpro.dto.response.ApiResponse;
import com.recruitpro.model.JobSeeker;
import com.recruitpro.security.UserPrincipal;
import com.recruitpro.service.JobInteractionService;
import com.recruitpro.service.JobSeekerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/jobseeker/interactions")
@PreAuthorize("hasRole('JOBSEEKER')")
@RequiredArgsConstructor
public class JobInteractionController {

    private final JobInteractionService interactionService;
    private final JobSeekerService jobSeekerService;

    /**
     * POST /api/v1/jobseeker/interactions
     *
     * <p>Logs a behavioral event (click / save / apply) from the frontend.
     * The backend debounces duplicate click events and asynchronously syncs
     * each interaction to the AI recommendation server.
     */
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> log(
            @Valid @RequestBody LogInteractionRequestDto req,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        JobSeeker seeker = jobSeekerService.findByUserId(UUID.fromString(principal.getId()));
        interactionService.log(
                seeker.getId(),
                req.getJobId(),
                req.getEventType(),
                req.getResumeId(),
                req.getMetadata()
        );
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
