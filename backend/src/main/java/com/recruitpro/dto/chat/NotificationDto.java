package com.recruitpro.dto.chat;

import com.fasterxml.jackson.annotation.JsonProperty;
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
public class NotificationDto {
    private UUID    id;
    private String  type;
    private String  title;
    private String  content;
    @JsonProperty("isRead")
    private boolean isRead;
    private UUID    referenceId;
    private String  referenceType;
    private Instant createdAt;
}
