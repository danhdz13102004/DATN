package com.recruitpro.controller;

import com.recruitpro.dto.response.ApiResponse;
import com.recruitpro.dto.response.IndustryResponseDto;
import com.recruitpro.model.Industry;
import com.recruitpro.service.IndustryService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/industries")
@RequiredArgsConstructor
public class IndustryController {

    private final IndustryService industryService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<IndustryResponseDto>>> listAll() {
        List<Industry> industries = industryService.findAll();
        List<IndustryResponseDto> response = industries.stream()
                .sorted((a, b) -> a.getName().compareToIgnoreCase(b.getName()))
                .map(ind -> IndustryResponseDto.builder()
                        .id(ind.getId())
                        .name(ind.getName())
                        .jobUsageCount(industryService.getJobUsageCount(ind.getId()))
                        .build())
                .toList();
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<IndustryResponseDto>> create(@RequestBody Map<String, String> body) {
        Industry industry = industryService.create(body.get("name"));
        IndustryResponseDto dto = IndustryResponseDto.builder()
                .id(industry.getId())
                .name(industry.getName())
                .jobUsageCount(0)
                .build();
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(dto));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<IndustryResponseDto>> update(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body
    ) {
        Industry industry = industryService.update(id, body.get("name"));
        IndustryResponseDto dto = IndustryResponseDto.builder()
                .id(industry.getId())
                .name(industry.getName())
                .jobUsageCount(industryService.getJobUsageCount(industry.getId()))
                .build();
        return ResponseEntity.ok(ApiResponse.ok(dto));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, String>>> delete(@PathVariable UUID id) {
        industryService.delete(id);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("message", "Industry deleted")));
    }
}