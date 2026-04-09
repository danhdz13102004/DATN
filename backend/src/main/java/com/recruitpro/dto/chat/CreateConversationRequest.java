package com.recruitpro.dto.chat;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateConversationRequest {
    @NotNull  private java.util.UUID applicationId;
}
