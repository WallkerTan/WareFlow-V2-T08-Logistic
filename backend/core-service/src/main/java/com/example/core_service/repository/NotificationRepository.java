package com.example.core_service.repository;

import com.example.core_service.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByRecipient_IdOrderByCreatedAtDesc(UUID recipientId);
}

