package com.recruitpro.dto.chat;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MessageResponseDto {
    private UUID    id;
    private UUID    conversationId;
    private UUID    senderId;
    private String  senderName;
    private String  senderRole;      // "STAFF" or "JOBSEEKER"
    private String  content;
    private String  type;            // "TEXT" or "FILE"
    private String  fileUrl;         // presigned GET URL generated on demand
    private String  fileName;
    private Long    fileSizeBytes;
    private boolean isRead;
    private Instant createdAt;
}
