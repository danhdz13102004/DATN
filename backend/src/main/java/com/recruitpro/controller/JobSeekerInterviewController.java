package com.recruitpro.controller;

import com.recruitpro.dto.response.ApiResponse;
import com.recruitpro.dto.response.JobSeekerInterviewListItemDto;
import com.recruitpro.dto.response.JobSeekerInterviewStatsDto;
import com.recruitpro.dto.response.PaginationMeta;
import com.recruitpro.model.enums.InterviewStatus;
import com.recruitpro.model.enums.MeetingType;
import com.recruitpro.security.UserPrincipal;
import com.recruitpro.service.JobSeekerInterviewService;
import com.recruitpro.service.JobSeekerService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/jobseeker/interviews")
@PreAuthorize("hasRole('JOBSEEKER')")
@RequiredArgsConstructor
public class JobSeekerInterviewController {

    private final JobSeekerInterviewService interviewService;
    private final JobSeekerService jobSeekerService;

    @GetMapping
    public ResponseEntity<ApiResponse<Object>> list(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) InterviewStatus status,
            @RequestParam(required = false) MeetingType meetingType,
            @PageableDefault(size = 20) Pageable pageable
    ) {
        UUID seekerId = jobSeekerService.findByUserId(UUID.fromString(principal.getId())).getId();

        Page<JobSeekerInterviewListItemDto> page = interviewService.listForSeeker(
                seekerId, status, meetingType, pageable);

        PaginationMeta meta = PaginationMeta.builder()
                .page(page.getNumber() + 1)
                .pageSize(page.getSize())
                .total(page.getTotalElements())
                .build();

        return ResponseEntity.ok(ApiResponse.ok(page.getContent(), meta));
    }

    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<JobSeekerInterviewStatsDto>> getStats(
            @AuthenticationPrincipal UserPrincipal principal) {
        UUID seekerId = jobSeekerService.findByUserId(UUID.fromString(principal.getId())).getId();
        return ResponseEntity.ok(ApiResponse.ok(interviewService.getStats(seekerId)));
    }
}
