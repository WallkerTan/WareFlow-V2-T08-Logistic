package com.example.core_service.repository;
import com.example.core_service.entity.PurchaseBatch;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface PurchaseBatchRepository extends JpaRepository<PurchaseBatch,UUID> {
    Optional<PurchaseBatch> findByCompanyIdAndCreatedByAndChatRequestId(UUID companyId, UUID createdBy, UUID chatRequestId);
    List<PurchaseBatch> findByCompanyIdOrderByCreatedAtDesc(UUID companyId);
}
