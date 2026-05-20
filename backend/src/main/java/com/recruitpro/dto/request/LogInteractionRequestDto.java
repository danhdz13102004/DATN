package com.recruitpro.dto.request;

import com.recruitpro.model.enums.InteractionEventType;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LogInteractionRequestDto {

    @NotNull
    private UUID jobId;

    @NotNull
    private InteractionEventType eventType;

    /**
     * Single resume ID for apply events (ground truth signals).
     * When specified, this exact resume is used for AI sync.
     */
    private UUID resumeId;

    /**
     * Multiple resume IDs for click/save events.
     * The AI service will compute soft attribution across these resumes.
     * Either resumeId OR resumeIds must be provided, not both.
     */
    private List<UUID> resumeIds;

    /**
     * Optional metadata: source page, device type, etc.
     */
    private Map<String, Object> metadata;
}
