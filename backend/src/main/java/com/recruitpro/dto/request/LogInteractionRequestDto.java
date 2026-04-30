package com.recruitpro.dto.request;

import com.recruitpro.model.enums.InteractionEventType;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.Map;
import java.util.UUID;

@Data
public class LogInteractionRequestDto {

    @NotNull
    private UUID jobId;

    @NotNull
    private InteractionEventType eventType;

    /** Optional resume used for this interaction — needed for AI sync. */
    private UUID resumeId;

    /** Optional metadata: source page, device type, etc. */
    private Map<String, Object> metadata;
}
