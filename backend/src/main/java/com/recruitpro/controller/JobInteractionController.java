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
     *
     * <p>For APPLY events:
     * <pre>{@code
     * {
     *     "jobId": "uuid",
     *     "eventType": "apply",
     *     "resumeId": "uuid"  // single resume
     * }
     * }</pre>
     * Uses explicit resume_id, creates a graph edge, updates GraphSAGE embedding.
     *
     * <p>For CLICK/SAVE events:
     * <pre>{@code
     * {
     *     "jobId": "uuid",
     *     "eventType": "click"
     * }
     * }</pre>
     * Records interaction at user level as a behavioral signal.
     * No graph edge is created. Signals feed into the preference vector only.
     */
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> log(
            @Valid @RequestBody LogInteractionRequestDto req,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        JobSeeker seeker = jobSeekerService.findByUserId(UUID.fromString(principal.getId()));

        // Determine if this is an apply event (single resume) or click/save (multi-resume)
        if (req.getEventType().isApply()) {
            // Apply events use explicit single resume_id
            interactionService.logWithSingleResume(
                    seeker.getId(),
                    req.getJobId(),
                    req.getEventType(),
                    req.getResumeId(),
                    req.getMetadata()
            );
        } else {
            // Click/save events use multiple resumes with soft attribution
            interactionService.logWithMultipleResumes(
                    seeker.getId(),
                    req.getJobId(),
                    req.getEventType(),
                    req.getResumeIds(),
                    req.getMetadata()
            );
        }

        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
