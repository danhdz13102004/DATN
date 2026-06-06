package com.recruitpro.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class IndustryResponseDto {
    private UUID id;
    private String name;
    private long jobUsageCount;
}
