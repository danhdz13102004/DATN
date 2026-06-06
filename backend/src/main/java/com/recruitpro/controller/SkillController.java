package com.recruitpro.controller;

import com.recruitpro.dto.response.ApiResponse;
import com.recruitpro.dto.response.SkillResponseDto;
import com.recruitpro.model.Skill;
import com.recruitpro.service.SkillService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/skills")
@RequiredArgsConstructor
public class SkillController {

    private final SkillService skillService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<SkillResponseDto>>> list() {
        List<Skill> skills = skillService.findAll();
        List<SkillResponseDto> response = skills.stream()
                .map(skill -> SkillResponseDto.builder()
                        .id(skill.getId())
                        .name(skill.getName())
                        .jobUsageCount(skillService.getJobUsageCount(skill.getId()))
                        .build())
                .toList();
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<SkillResponseDto>> create(@RequestBody Map<String, String> body) {
        Skill skill = skillService.create(body.get("name"));
        SkillResponseDto dto = SkillResponseDto.builder()
                .id(skill.getId())
                .name(skill.getName())
                .jobUsageCount(0)
                .build();
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(dto));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<SkillResponseDto>> update(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body
    ) {
        Skill skill = skillService.update(id, body.get("name"));
        SkillResponseDto dto = SkillResponseDto.builder()
                .id(skill.getId())
                .name(skill.getName())
                .jobUsageCount(skillService.getJobUsageCount(skill.getId()))
                .build();
        return ResponseEntity.ok(ApiResponse.ok(dto));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, String>>> delete(@PathVariable UUID id) {
        skillService.delete(id);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("message", "Skill deleted")));
    }
}
