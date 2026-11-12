package com.example.core_service.controller;

import com.example.core_service.entity.Notification;
import com.example.core_service.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * API đọc thông báo của user đang đăng nhập.
 * Base path (qua gateway): /api/core/notifications
 */
@RestController
@RequestMapping("/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    /**
     * Lấy danh sách thông báo của user hiện tại (sắp xếp mới nhất trước).
     * GET /api/core/notifications
     */
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public List<View> getMyNotifications() {
        return notificationService.getCurrentUserNotifications().stream().map(n -> new View(n.getId(),n.getType(),n.getTitle(),n.getScope().name(),n.getPayload(),n.getIsRead(),n.getCreatedAt())).toList();
    }

    @GetMapping("/unread-count")
    @PreAuthorize("isAuthenticated()")
    public long getUnreadCount() {
        return notificationService.countCurrentUserUnread();
    }

    /**
     * Đánh dấu thông báo đã đọc.
     * PATCH /api/core/notifications/{id}/read
     */
    @PatchMapping("/{id}/read")
    @PreAuthorize("isAuthenticated()")
    public void markAsRead(@PathVariable Long id) {
        notificationService.markCurrentUserNotificationAsRead(id);
    }

    @PatchMapping("/read-all")
    @PreAuthorize("isAuthenticated()")
    public int markAllAsRead() {
        return notificationService.markAllCurrentUserNotificationsAsRead();
    }
    public record View(Long id,String type,String title,String scope,java.util.Map<String,Object> payload,Boolean isRead,java.time.Instant createdAt) { }
}
