package com.recruitpro.controller;

import com.recruitpro.dto.response.ApiResponse;
import com.recruitpro.model.enums.ApplicationStatus;
import com.recruitpro.model.enums.JobStatus;
import com.recruitpro.model.enums.UserStatus;
import com.recruitpro.repository.ApplicationRepository;
import com.recruitpro.repository.CompanyRepository;
import com.recruitpro.repository.JobRepository;
import com.recruitpro.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin/stats")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminStatsController {

    private final UserRepository userRepository;
    private final CompanyRepository companyRepository;
    private final JobRepository jobRepository;
    private final ApplicationRepository applicationRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> getStats() {
        Map<String, Object> stats = new LinkedHashMap<>();

        stats.put("totalUsers", userRepository.count());
        stats.put("activeUsers", userRepository.countByStatus(UserStatus.ACTIVE));
        stats.put("suspendedUsers", userRepository.countByStatus(UserStatus.SUSPENDED));
        stats.put("pendingUsers", userRepository.countByStatus(UserStatus.PENDING_VERIFICATION));

        stats.put("totalCompanies", companyRepository.count());
        stats.put("verifiedCompanies", companyRepository.countByVerified(true));
        stats.put("pendingCompanies", companyRepository.countByVerified(false));

        stats.put("totalJobs", jobRepository.count());
        stats.put("publishedJobs", jobRepository.countByStatus(JobStatus.PUBLISHED));

        stats.put("totalApplications", applicationRepository.count());
        stats.put("appliedApplications", applicationRepository.countByStatus(ApplicationStatus.APPLIED));

        return ResponseEntity.ok(ApiResponse.ok(stats));
    }
}
