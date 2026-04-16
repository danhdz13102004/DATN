package com.recruitpro.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class PaymentHistoryDto {

    private UUID id;
    private BigDecimal amount;
    private String currency;
    private String gateway;
    private String status;
    private String transactionId;
    private String description;
    private Instant createdAt;
}
