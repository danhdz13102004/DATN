package com.recruitpro.dto.chat;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.util.UUID;

@Data
public class SendMessageRequest {

    @NotNull(message = "conversationId is required")
    private UUID conversationId;

    private String content;          // required for TEXT type

    @NotBlank(message = "type is required")
    private String type;             // "TEXT" or "FILE"

    private String fileKey;          // MinIO object key — required for FILE type
    private String fileName;
    private Long   fileSizeBytes;

    @NotBlank(message = "idempotencyKey is required")
    private String idempotencyKey;   // client-generated UUID for deduplication
}
