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
public class ConversationResponseDto {
    private UUID    id;
    private UUID    applicationId;
    private UUID    staffId;
    private String  staffName;
    private UUID    jobSeekerId;
    private String  jobSeekerName;
    private boolean isInitiated;
    private String  lastMessage;
    private Instant lastMessageAt;
    private long    unreadCount;
    private Instant createdAt;
}
