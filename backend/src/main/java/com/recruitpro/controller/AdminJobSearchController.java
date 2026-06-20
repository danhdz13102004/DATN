package com.recruitpro.controller;

import com.recruitpro.dto.response.ApiResponse;
import com.recruitpro.search.JobSearchIndexService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

import static org.springframework.http.HttpStatus.BAD_REQUEST;

@RestController
@RequestMapping("/api/v1/admin/job-search")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminJobSearchController {

    private final JobSearchIndexService jobSearchIndexService;

    private enum Scope {
        ALL,
        COMPANY,
        JOB
    }

    @PostMapping("/reindex")
    public ResponseEntity<ApiResponse<Map<String, Object>>> reindex() {
        int indexed = jobSearchIndexService.reindexAll();
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("indexed", indexed);
        return ResponseEntity.ok(ApiResponse.ok(payload));
    }

    @GetMapping("/sync")
    public ResponseEntity<ApiResponse<Map<String, Object>>> sync() {
        return reindex();
    }

    @PostMapping("/sync")
    public ResponseEntity<ApiResponse<Map<String, Object>>> sync(
            @RequestParam(defaultValue = "ALL") Scope scope,
            @RequestParam(required = false) UUID id
    ) {
        UUID targetId = requireTargetId(scope, id);
        int indexed = switch (scope) {
            case ALL -> jobSearchIndexService.reindexAll();
            case COMPANY -> jobSearchIndexService.syncCompanyJobs(targetId);
            case JOB -> jobSearchIndexService.syncJob(targetId);
        };

        Map<String, Object> payload = basePayload("sync", scope, targetId);
        payload.put("indexed", indexed);
        return ResponseEntity.ok(ApiResponse.ok(payload));
    }

    @PostMapping("/clear")
    public ResponseEntity<ApiResponse<Map<String, Object>>> clear(
            @RequestParam(defaultValue = "ALL") Scope scope,
            @RequestParam(required = false) UUID id
    ) {
        UUID targetId = requireTargetId(scope, id);
        int cleared = 0;
        boolean clearedAll = false;

        switch (scope) {
            case ALL -> clearedAll = jobSearchIndexService.clearAll();
            case COMPANY -> cleared = jobSearchIndexService.deleteCompanyJobs(targetId);
            case JOB -> cleared = jobSearchIndexService.deleteJob(targetId);
        }

        Map<String, Object> payload = basePayload("clear", scope, targetId);
        payload.put("cleared", cleared);
        payload.put("clearedAll", clearedAll);
        return ResponseEntity.ok(ApiResponse.ok(payload));
    }

    @PostMapping("/clear-and-sync")
    public ResponseEntity<ApiResponse<Map<String, Object>>> clearAndSync(
            @RequestParam(defaultValue = "ALL") Scope scope,
            @RequestParam(required = false) UUID id
    ) {
        UUID targetId = requireTargetId(scope, id);
        int cleared = 0;
        boolean clearedAll = false;
        int indexed;

        switch (scope) {
            case ALL -> {
                indexed = jobSearchIndexService.reindexAll();
                clearedAll = jobSearchIndexService.isEnabled();
            }
            case COMPANY -> {
                cleared = jobSearchIndexService.deleteCompanyJobs(targetId);
                indexed = jobSearchIndexService.reindexCompanyJobs(targetId);
            }
            case JOB -> {
                cleared = jobSearchIndexService.deleteJob(targetId);
                indexed = jobSearchIndexService.syncJob(targetId);
            }
            default -> throw new ResponseStatusException(BAD_REQUEST, "Unsupported sync scope.");
        }

        Map<String, Object> payload = basePayload("clear-and-sync", scope, targetId);
        payload.put("cleared", cleared);
        payload.put("clearedAll", clearedAll);
        payload.put("indexed", indexed);
        return ResponseEntity.ok(ApiResponse.ok(payload));
    }

    private UUID requireTargetId(Scope scope, UUID id) {
        if (scope != Scope.ALL && id == null) {
            throw new ResponseStatusException(BAD_REQUEST, "A company id or job id is required for this scope.");
        }
        return id;
    }

    private Map<String, Object> basePayload(String action, Scope scope, UUID id) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("action", action);
        payload.put("scope", scope.name());
        if (id != null) {
            payload.put("id", id);
        }
        return payload;
    }
}
