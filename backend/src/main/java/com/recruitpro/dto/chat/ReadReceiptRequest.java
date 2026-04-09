package com.recruitpro.dto.chat;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.util.UUID;

@Data
public class ReadReceiptRequest {
    @NotNull private UUID conversationId;
    @NotNull private UUID lastReadMessageId;
}
