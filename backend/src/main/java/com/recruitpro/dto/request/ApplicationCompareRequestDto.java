package com.recruitpro.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class ApplicationCompareRequestDto {

    @NotNull
    private UUID jobId;

    @NotNull
    private UUID resumeId;
}
