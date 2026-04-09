package com.recruitpro.service;

import com.recruitpro.cache.RedisPublisher;
import com.recruitpro.dto.chat.NotificationDto;
import com.recruitpro.dto.chat.NotificationEvent;
import com.recruitpro.model.Notification;
import com.recruitpro.model.enums.NotificationType;
import com.recruitpro.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final RedisPublisher         redisPublisher;

    @Transactional
    public void createAndPublish(UUID userId, NotificationType type,
                                  String title, String content,
                                  UUID referenceId, String referenceType) {
        Notification notif = Notification.builder()
                .userId(userId)
                .type(type)
                .title(title)
                .content(content)
                .isRead(false)
                .referenceId(referenceId)
                .referenceType(referenceType)
                .build();
        notificationRepository.save(notif);

        long unreadCount = notificationRepository.countByUserIdAndIsReadFalse(userId);

        NotificationEvent event = NotificationEvent.builder()
                .eventType("NOTIFICATION")
                .userId(userId)
                .notification(toDto(notif))
                .unreadCount(unreadCount)
                .build();

        redisPublisher.publish("redis:channel:notification:" + userId, event);
        log.debug("[NOTIF] Created and published notification for user {}", userId);
    }

    @Transactional(readOnly = true)
    public Page<NotificationDto> list(UUID userId, int page, int size) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(
                        userId, PageRequest.of(page, Math.min(size, 50)))
                .map(this::toDto);
    }

    @Transactional(readOnly = true)
    public long unreadCount(UUID userId) {
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }

    @Transactional
    public void markRead(UUID notifId, UUID userId) {
        notificationRepository.findById(notifId).ifPresent(n -> {
            if (n.getUserId().equals(userId) && !n.isRead()) {
                n.setRead(true);
                notificationRepository.save(n);
                publishEvent(userId, "NOTIFICATION_READ", toDto(n));
            }
        });
    }

    @Transactional
    public void markAllRead(UUID userId) {
        int updated = notificationRepository.markAllReadByUserId(userId);
        if (updated > 0) {
            publishEvent(userId, "NOTIFICATION_COUNT", null);
        }
    }

    private void publishEvent(UUID userId, String eventType, NotificationDto notification) {
        long unreadCount = notificationRepository.countByUserIdAndIsReadFalse(userId);

        NotificationEvent event = NotificationEvent.builder()
                .eventType(eventType)
                .userId(userId)
                .notification(notification)
                .unreadCount(unreadCount)
                .build();

        redisPublisher.publish("redis:channel:notification:" + userId, event);
    }

    private NotificationDto toDto(Notification n) {
        return NotificationDto.builder()
                .id(n.getId())
                .type(n.getType().name())
                .title(n.getTitle())
                .content(n.getContent())
                .isRead(n.isRead())
                .referenceId(n.getReferenceId())
                .referenceType(n.getReferenceType())
                .createdAt(n.getCreatedAt())
                .build();
    }
}
