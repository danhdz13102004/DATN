package com.recruitpro.controller;

import com.recruitpro.dto.chat.ConversationResponseDto;
import com.recruitpro.dto.chat.CreateConversationRequest;
import com.recruitpro.dto.chat.MessageResponseDto;
import com.recruitpro.dto.response.ApiResponse;
import com.recruitpro.exception.ResourceNotFoundException;
import com.recruitpro.model.Conversation;
import com.recruitpro.repository.JobSeekerRepository;
import com.recruitpro.security.UserPrincipal;
import com.recruitpro.service.ConversationService;
import com.recruitpro.service.MessageService;
import jakarta.validation.Valid;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ConversationService conversationService;
    private final MessageService      messageService;
    private final JobSeekerRepository jobSeekerRepository;

    /** Staff only: create a conversation for an application */
    @PostMapping("/conversations")
    @PreAuthorize("hasRole('COMPANY')")
    public ResponseEntity<ApiResponse<ConversationResponseDto>> createConversation(
            @Valid @RequestBody CreateConversationRequest req,
            @AuthenticationPrincipal UserPrincipal principal) {

        UUID userId = UUID.fromString(principal.getId());
        Conversation conv = conversationService.createConversation(req.getApplicationId(), userId);

        List<ConversationResponseDto> list = conversationService.listForStaff(userId);
        ConversationResponseDto dto = list.stream()
                .filter(c -> c.getId().equals(conv.getId()))
                .findFirst()
                .orElse(ConversationResponseDto.builder().id(conv.getId()).build());

        return ResponseEntity.ok(ApiResponse.ok(dto));
    }

    /** List conversations for the authenticated user */
    @GetMapping("/conversations")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<ConversationResponseDto>>> listConversations(
            @AuthenticationPrincipal UserPrincipal principal) {

        UUID userId = UUID.fromString(principal.getId());
        List<ConversationResponseDto> result;

        if ("COMPANY".equals(principal.getRole())) {
            result = conversationService.listForStaff(userId);
        } else {
            var seeker = jobSeekerRepository.findByUserId(userId)
                    .orElseThrow(() -> new ResourceNotFoundException("Job seeker profile not found"));
            result = conversationService.listForJobSeeker(seeker.getId());
        }
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    /** Paginated message history for a conversation */
    @GetMapping("/conversations/{id}/messages")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Page<MessageResponseDto>>> getMessages(
            @PathVariable UUID id,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "30") int size,
            @AuthenticationPrincipal UserPrincipal principal) {

        conversationService.assertParticipant(id, UUID.fromString(principal.getId()));
        return ResponseEntity.ok(ApiResponse.ok(messageService.getHistory(id, page, size)));
    }

    /** Request a MinIO presigned upload URL for a file message */
    @PostMapping("/conversations/{id}/upload-url")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Map<String, String>>> getUploadUrl(
            @PathVariable UUID id,
            @RequestBody UploadUrlRequest req,
            @AuthenticationPrincipal UserPrincipal principal) {

        conversationService.assertParticipant(id, UUID.fromString(principal.getId()));
        String fileKey = "chat-files/" + id + "/" + UUID.randomUUID() + "_" + req.getFileName();
        return ResponseEntity.ok(ApiResponse.ok(Map.of("fileKey", fileKey)));
    }

    @Data
    public static class UploadUrlRequest {
        private String fileName;
        private String fileType;
        private Long   fileSizeBytes;
    }
}
