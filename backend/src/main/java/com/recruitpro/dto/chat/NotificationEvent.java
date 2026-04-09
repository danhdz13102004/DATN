package com.recruitpro.dto.chat;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/** Delivered to /user/queue/notification */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationEvent {
    private String  eventType;       // "NOTIFICATION"
    private UUID    userId;
    private NotificationDto notification;
    private long    unreadCount;
}
