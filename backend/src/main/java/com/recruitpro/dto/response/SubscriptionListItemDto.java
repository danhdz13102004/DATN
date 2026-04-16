package com.recruitpro.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class SubscriptionListItemDto {
    private UUID id;
    private String companyId;
    private String companyName;
    private String planId;
    private String planName;
    private Instant startDate;
    private Instant endDate;
    private String status;
    private int jobsPostedCount;
    private Instant createdAt;
}
