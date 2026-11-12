package com.example.core_service.repository;

import com.example.core_service.entity.Notification;
import com.example.core_service.entity.enums.NotificationScope;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("select n from Notification n join fetch n.recipient where n.emailSentAt is null and n.emailAttempts < 10 and (n.emailRetryAt is null or n.emailRetryAt <= :now) order by n.id")
    List<Notification> pendingEmail(@Param("now") java.time.Instant now, org.springframework.data.domain.Pageable page);
    List<Notification> findByRecipient_IdOrderByCreatedAtDesc(UUID recipientId);

    @Query("select n from Notification n where n.recipient.id = :recipientId "
            + "or (:includeSystemBroadcasts = true and n.recipient is null and n.scope = :systemScope) "
            + "order by n.createdAt desc")
    List<Notification> findVisibleToUser(@Param("recipientId") UUID recipientId,
                                         @Param("includeSystemBroadcasts") boolean includeSystemBroadcasts,
                                         @Param("systemScope") NotificationScope systemScope);

    @Query("select count(n) from Notification n where n.recipient.id = :recipientId "
            + "and n.isRead = false")
    long countUnreadForUser(@Param("recipientId") UUID recipientId);

    @Query("select count(n) from Notification n where (n.recipient.id = :recipientId "
            + "or (n.recipient is null and n.scope = :systemScope)) and n.isRead = false")
    long countUnreadForSystemAdmin(@Param("recipientId") UUID recipientId,
                                   @Param("systemScope") NotificationScope systemScope);

    @Modifying
    @Transactional
    @Query("update Notification n set n.isRead = true where n.recipient.id = :recipientId and n.isRead = false")
    int markAllReadForUser(@Param("recipientId") UUID recipientId);

    @Modifying
    @Transactional
    @Query("update Notification n set n.isRead = true where (n.recipient.id = :recipientId "
            + "or (n.recipient is null and n.scope = :systemScope)) and n.isRead = false")
    int markAllReadForSystemAdmin(@Param("recipientId") UUID recipientId,
                                  @Param("systemScope") NotificationScope systemScope);
}
