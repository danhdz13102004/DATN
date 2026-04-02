package com.recruitpro.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class ApplyRequestDto {

    @NotNull(message = "Job ID is required")
    private UUID jobId;

    @NotNull(message = "Resume ID is required")
    private UUID resumeId;

    private String coverLetter;
}
