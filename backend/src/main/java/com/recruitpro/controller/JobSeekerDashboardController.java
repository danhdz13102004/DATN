package com.recruitpro.controller;

import com.recruitpro.dto.response.ApiResponse;
import com.recruitpro.dto.response.JobSeekerApplicationListItemDto;
import com.recruitpro.dto.response.JobSeekerDashboardStatsDto;
import com.recruitpro.dto.response.JobSeekerInterviewListItemDto;
import com.recruitpro.security.UserPrincipal;
import com.recruitpro.service.JobSeekerDashboardService;
import com.recruitpro.service.JobSeekerService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/jobseeker/dashboard")
@PreAuthorize("hasRole('JOBSEEKER')")
@RequiredArgsConstructor
public class JobSeekerDashboardController {

    private final JobSeekerDashboardService dashboardService;
    private final JobSeekerService jobSeekerService;

    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<JobSeekerDashboardStatsDto>> getStats(
            @AuthenticationPrincipal UserPrincipal principal) {
        UUID seekerId = jobSeekerService.findByUserId(UUID.fromString(principal.getId())).getId();
        return ResponseEntity.ok(ApiResponse.ok(dashboardService.getStats(seekerId)));
    }

    @GetMapping("/recent-applications")
    public ResponseEntity<ApiResponse<List<JobSeekerApplicationListItemDto>>> getRecentApplications(
            @AuthenticationPrincipal UserPrincipal principal) {
        UUID seekerId = jobSeekerService.findByUserId(UUID.fromString(principal.getId())).getId();
        return ResponseEntity.ok(ApiResponse.ok(dashboardService.getRecentApplications(seekerId)));
    }

    @GetMapping("/upcoming-interviews")
    public ResponseEntity<ApiResponse<List<JobSeekerInterviewListItemDto>>> getUpcomingInterviews(
            @AuthenticationPrincipal UserPrincipal principal) {
        UUID seekerId = jobSeekerService.findByUserId(UUID.fromString(principal.getId())).getId();
        return ResponseEntity.ok(ApiResponse.ok(dashboardService.getUpcomingInterviews(seekerId)));
    }
}
