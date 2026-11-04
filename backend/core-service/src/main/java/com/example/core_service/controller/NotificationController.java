package com.example.core_service.controller;

import com.example.core_service.entity.Notification;
import com.example.core_service.repository.NotificationRepository;
import com.example.core_service.security.SecurityUtils;
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

    private final NotificationRepository notificationRepository;

    /**
     * Lấy danh sách thông báo của user hiện tại (sắp xếp mới nhất trước).
     * GET /api/core/notifications
     */
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public List<Notification> getMyNotifications() {
        return notificationRepository.findByRecipient_IdOrderByCreatedAtDesc(
                SecurityUtils.getCurrentUserId()
        );
    }

    /**
     * Đánh dấu thông báo đã đọc.
     * PATCH /api/core/notifications/{id}/read
     */
    @PatchMapping("/{id}/read")
    @PreAuthorize("isAuthenticated()")
    public void markAsRead(@PathVariable Long id) {
        notificationRepository.findById(id).ifPresent(n -> {
            if (SecurityUtils.getCurrentUserId().equals(
                    n.getRecipient() != null ? n.getRecipient().getId() : null)) {
                n.setIsRead(true);
                notificationRepository.save(n);
            }
        });
    }
}

