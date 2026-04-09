package com.recruitpro.chat;

import com.recruitpro.cache.ChatCacheService;
import com.recruitpro.cache.RedisPublisher;
import com.recruitpro.dto.chat.*;
import com.recruitpro.exception.ForbiddenException;
import com.recruitpro.model.Conversation;
import com.recruitpro.model.Message;
import com.recruitpro.model.enums.UserRole;
import com.recruitpro.repository.JobSeekerRepository;
import com.recruitpro.repository.StaffRepository;
import com.recruitpro.repository.UserRepository;
import com.recruitpro.service.ConversationService;
import com.recruitpro.service.MessageService;
import com.recruitpro.service.NotificationService;
import com.recruitpro.model.enums.NotificationType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Controller;
import org.springframework.validation.annotation.Validated;

import java.security.Principal;
import java.util.UUID;

@Slf4j
@Controller
@RequiredArgsConstructor
public class ChatMessageHandler {

    private final ConversationService conversationService;
    private final MessageService      messageService;
    private final NotificationService notificationService;
    private final ChatCacheService    chatCacheService;
    private final RedisPublisher      redisPublisher;
    private final UserRepository      userRepository;
    private final StaffRepository     staffRepository;
    private final JobSeekerRepository jobSeekerRepository;

    @MessageMapping("/chat.send")
    public void handleSend(@Payload @Validated SendMessageRequest req, Principal principal) {
        UUID senderId = UUID.fromString(principal.getName());
        var  sender   = userRepository.findById(senderId)
                .orElseThrow(() -> new ForbiddenException("Unknown user"));

        Conversation conv = conversationService.getConversationOrThrow(req.getConversationId());

        // ── Enforce initiation rule ─────────────────────────────────────────
        if (!conv.isInitiated()) {
            if (sender.getRole() != UserRole.COMPANY) {
                throw new ForbiddenException("Only staff can initiate a conversation");
            }
            // Validate staff belongs to the same company
            staffRepository.findByUserId(senderId).ifPresent(staff -> {
                var convStaff = staffRepository.findById(conv.getStaffId())
                        .orElseThrow(() -> new ForbiddenException("Conversation staff not found"));
                if (!staff.getCompanyId().equals(convStaff.getCompanyId())) {
                    throw new ForbiddenException("Conversation belongs to a different company");
                }
            });
        } else {
            // Validate sender is a participant
            boolean isStaff = sender.getRole() == UserRole.COMPANY &&
                    staffRepository.findByUserId(senderId)
                            .map(s -> s.getId().equals(conv.getStaffId())).orElse(false);
            boolean isSeeker = sender.getRole() == UserRole.JOBSEEKER &&
                    jobSeekerRepository.findByUserId(senderId)
                            .map(js -> js.getId().equals(conv.getJobSeekerId())).orElse(false);
            if (!isStaff && !isSeeker) {
                throw new ForbiddenException("Not a participant of this conversation");
            }
        }

        // ── Save message ────────────────────────────────────────────────────
        Message saved = messageService.saveMessage(conv.getId(), senderId, req);

        // ── Mark conversation as initiated ──────────────────────────────────
        if (!conv.isInitiated()) {
            conversationService.markAsInitiated(conv.getId());
        }
        conversationService.touchUpdatedAt(conv.getId());

        // ── Build response DTO ──────────────────────────────────────────────
        String senderName = sender.getFullName() != null ? sender.getFullName() : sender.getEmail();
        String senderRole = sender.getRole() == UserRole.COMPANY ? "STAFF" : "JOBSEEKER";

        MessageResponseDto msgDto = messageService.toDto(saved);
        msgDto.setSenderName(senderName);
        msgDto.setSenderRole(senderRole);

        // ── Publish to Redis → all instances relay via STOMP ────────────────
        ChatMessageEvent event = ChatMessageEvent.builder()
                .eventType("CHAT_MESSAGE")
                .conversationId(conv.getId())
                .message(msgDto)
                .build();
        redisPublisher.publish("redis:channel:chat:" + conv.getId(), event);

        // ── Create notification for the recipient ───────────────────────────
        UUID recipientUserId = resolveRecipientUserId(conv, sender.getRole());
        if (recipientUserId != null) {
            notificationService.createAndPublish(
                    recipientUserId,
                    NotificationType.MESSAGE,
                    "New message from " + senderName,
                    saved.getContent() != null ? saved.getContent() : "📎 " + saved.getFileName(),
                    saved.getId(),
                    "message"
            );
        }

        log.info("[CHAT] msg {} saved in conv {} by {}", saved.getId(), conv.getId(), senderId);
    }

    @MessageMapping("/chat.read")
    public void handleRead(@Payload @Validated ReadReceiptRequest req, Principal principal) {
        UUID readerId = UUID.fromString(principal.getName());
        ReadReceiptEvent receipt = messageService.markAsRead(
                req.getConversationId(), readerId, req.getLastReadMessageId());

        redisPublisher.publish("redis:channel:read-receipt:" + req.getConversationId(), receipt);
    }

    @MessageMapping("/presence.ping")
    public void handlePresencePing(Principal principal) {
        UUID userId = UUID.fromString(principal.getName());
        chatCacheService.setUserOnline(userId);
    }

    private UUID resolveRecipientUserId(Conversation conv, UserRole senderRole) {
        if (senderRole == UserRole.COMPANY) {
            // Staff sent — notify the job seeker (JobSeeker.user is a @OneToOne User)
            return jobSeekerRepository.findById(conv.getJobSeekerId())
                    .map(js -> js.getUser().getId()).orElse(null);
        } else {
            // Job seeker sent — notify the staff (Staff.user is a @ManyToOne User)
            return staffRepository.findById(conv.getStaffId())
                    .map(s -> s.getUser().getId()).orElse(null);
        }
    }
}
