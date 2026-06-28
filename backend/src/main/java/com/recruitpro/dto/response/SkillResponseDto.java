package com.recruitpro.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class SkillResponseDto {
    private UUID id;
    private String name;
    private long jobUsageCount;
    private long jobSeekerUsageCount;
}
