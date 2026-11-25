package com.example.core_service.repository;

import com.example.core_service.entity.SupportRequest;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

import java.util.Optional;
import java.util.UUID;

public interface SupportRequestRepository extends JpaRepository<SupportRequest, UUID> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<SupportRequest> findByIdAndRepliedAtIsNull(UUID id);
}
