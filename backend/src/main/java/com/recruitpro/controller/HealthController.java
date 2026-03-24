package com.recruitpro.controller;

import com.recruitpro.dto.response.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class HealthController {

    @GetMapping("/api/v1/health")
    public ResponseEntity<ApiResponse<Map<String, String>>> health() {
        Map<String, String> status = Map.of(
                "status", "UP",
                "service", "recruitpro-backend"
        );
        return ResponseEntity.ok(ApiResponse.ok(status));
    }
}
