package com.recruitpro.dto.request;

import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class CreatePlanRequestDto {

    @NotBlank
    @Size(max = 100)
    private String name;

    @NotNull
    @DecimalMin("0.00")
    private BigDecimal price;

    @NotNull
    @Min(1)
    private Integer durationDays;

    @NotNull
    @Min(1)
    private Integer jobPostLimit;

    private boolean allowUseAiMatching = false;

    @Min(0)
    private Integer autoFillLimit = 0;
}
