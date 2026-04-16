package com.recruitpro.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class CompanySubscriptionDto {

    private UUID subscriptionId;
    private UUID planId;
    private String planName;
    private BigDecimal planPrice;
    private int jobPostLimit;       // 0 = unlimited
    private int durationDays;
    private boolean allowUseAiMatching;
    private Instant startDate;
    private Instant endDate;
    private String status;
    private int jobsPostedCount;
}
