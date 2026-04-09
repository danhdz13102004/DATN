package com.recruitpro.controller;

import com.recruitpro.dto.chat.NotificationDto;
import com.recruitpro.dto.response.ApiResponse;
import com.recruitpro.security.UserPrincipal;
import com.recruitpro.service.NotificationService;
import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Page<NotificationDto>>> list(
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal UserPrincipal principal) {

        return ResponseEntity.ok(ApiResponse.ok(
                notificationService.list(UUID.fromString(principal.getId()), page, size)));
    }

    @GetMapping("/unread-count")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Map<String, Long>>> unreadCount(
            @AuthenticationPrincipal UserPrincipal principal) {

        long count = notificationService.unreadCount(UUID.fromString(principal.getId()));
        return ResponseEntity.ok(ApiResponse.ok(Map.of("unreadCount", count)));
    }

    @PatchMapping("/{id}/read")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Void>> markRead(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {

        notificationService.markRead(id, UUID.fromString(principal.getId()));
        return ResponseEntity.ok(ApiResponse.<Void>ok(null));
    }

    @PatchMapping("/read-all")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Void>> markAllRead(
            @AuthenticationPrincipal UserPrincipal principal) {

        System.out.println("Marking all notifications as read for user: " + principal.toString());
        System.out.println("User ID: " + principal.getId());
        notificationService.markAllRead(UUID.fromString(principal.getId()));
        return ResponseEntity.ok(ApiResponse.<Void>ok(null));
    }
}
