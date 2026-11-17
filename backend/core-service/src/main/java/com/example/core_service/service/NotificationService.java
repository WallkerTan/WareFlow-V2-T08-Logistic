package com.example.core_service.service;

import com.example.core_service.entity.Notification;
import com.example.core_service.entity.User;
import com.example.core_service.entity.enums.NotificationScope;
import com.example.core_service.entity.enums.UserRole;
import com.example.core_service.security.SecurityUtils;
import com.example.core_service.repository.NotificationRepository;
import com.example.core_service.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Dịch vụ tạo và quản lý thông báo hệ thống.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<Notification> getCurrentUserNotifications() {
        boolean systemAdmin = SecurityUtils.getCurrentUserRole() == UserRole.SYSTEM_ADMIN;
        return notificationRepository.findVisibleToUser(
                SecurityUtils.getCurrentUserId(), systemAdmin, NotificationScope.SYSTEM);
    }

    @Transactional(readOnly = true)
    public long countCurrentUserUnread() {
        UUID userId = SecurityUtils.getCurrentUserId();
        if (SecurityUtils.getCurrentUserRole() == UserRole.SYSTEM_ADMIN) {
            return notificationRepository.countUnreadForSystemAdmin(userId, NotificationScope.SYSTEM);
        }
        return notificationRepository.countUnreadForUser(userId);
    }

    @Transactional
    public void markCurrentUserNotificationAsRead(Long notificationId) {
        notificationRepository.findById(notificationId).ifPresent(notification -> {
            UUID userId = SecurityUtils.getCurrentUserId();
            boolean ownNotification = notification.getRecipient() != null
                    && userId.equals(notification.getRecipient().getId());
            boolean visibleSystemBroadcast = SecurityUtils.getCurrentUserRole() == UserRole.SYSTEM_ADMIN
                    && notification.getRecipient() == null
                    && notification.getScope() == NotificationScope.SYSTEM;
            if (ownNotification || visibleSystemBroadcast) {
                notification.setIsRead(true);
                notificationRepository.save(notification);
            }
        });
    }

    @Transactional
    public int markAllCurrentUserNotificationsAsRead() {
        UUID userId = SecurityUtils.getCurrentUserId();
        if (SecurityUtils.getCurrentUserRole() == UserRole.SYSTEM_ADMIN) {
            return notificationRepository.markAllReadForSystemAdmin(userId, NotificationScope.SYSTEM);
        }
        return notificationRepository.markAllReadForUser(userId);
    }

    /**
     * Gửi thông báo đến một người dùng cụ thể.
     */
    @Transactional
    public Notification sendToUser(UUID recipientId, NotificationScope scope, String type,
                                   String title, Map<String, Object> payload) {
        User recipient = userRepository.findById(recipientId).orElse(null);
        Notification notification = Notification.builder()
                .recipient(recipient)
                .scope(scope)
                .type(type)
                .title(title)
                .payload(payload)
                .isRead(false)
                .build();
        return notificationRepository.save(notification);
    }

    /**
     * Gửi thông báo broadcast đến tất cả SYSTEM_ADMIN.
     * recipient = null → tất cả admin hệ thống đều thấy.
     */
    @Transactional
    public void notifyAllSystemAdmins(String type, String title, Map<String, Object> payload) {
        // SYSTEM_ADMIN không thuộc company nào (company = null)
        List<User> allAdmins = userRepository.findByRoleOrderByCreatedAtAsc(UserRole.SYSTEM_ADMIN);

        if (allAdmins.isEmpty()) {
            // Gửi broadcast (recipient = null) nếu không tìm thấy admin cụ thể
            Notification notification = Notification.builder()
                    .recipient(null)
                    .scope(NotificationScope.SYSTEM)
                    .type(type)
                    .title(title)
                    .payload(payload)
                    .isRead(false)
                    .build();
            notificationRepository.save(notification);
            log.info("Gửi broadcast notification: type={}, title={}", type, title);
        } else {
            for (User admin : allAdmins) {
                Notification notification = Notification.builder()
                        .recipient(admin)
                        .scope(NotificationScope.SYSTEM)
                        .type(type)
                        .title(title)
                        .payload(payload)
                        .isRead(false)
                        .build();
                notificationRepository.save(notification);
            }
            log.info("Đã gửi notification tới {} SYSTEM_ADMIN: type={}", allAdmins.size(), type);
        }
    }

    /**
     * Gửi thông báo broadcast — recipient = null (hiển thị cho toàn hệ thống).
     */
    @Transactional
    public Notification broadcastSystem(String type, String title, Map<String, Object> payload) {
        Notification notification = Notification.builder()
                .recipient(null)
                .scope(NotificationScope.SYSTEM)
                .type(type)
                .title(title)
                .payload(payload)
                .isRead(false)
                .build();
        return notificationRepository.save(notification);
    }
}
