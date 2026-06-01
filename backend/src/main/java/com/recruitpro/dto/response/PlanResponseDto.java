package com.recruitpro.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class PlanResponseDto {
    private UUID id;
    private String name;
    private BigDecimal price;
    private int jobPostLimit;
    private int durationDays;
    private boolean allowUseAiMatching;
    private int autoFillLimit;
    private Instant createdAt;
    private long activeSubscriptions;
}
