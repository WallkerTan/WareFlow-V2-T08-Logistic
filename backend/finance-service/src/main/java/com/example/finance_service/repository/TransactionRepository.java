package com.example.finance_service.repository;

import com.example.finance_service.entity.Transaction;
import com.example.finance_service.entity.enums.TransactionType;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.Instant;
import java.util.*;

public interface TransactionRepository extends JpaRepository<Transaction, Long> {
    Page<Transaction> findByCompanyIdAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(UUID companyId, Instant from, Instant to, Pageable pageable);
    Page<Transaction> findByCompanyIdAndWarehouseIdAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(UUID companyId, UUID warehouseId, Instant from, Instant to, Pageable pageable);
    Page<Transaction> findByCompanyIdAndTypeAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(UUID companyId, TransactionType type, Instant from, Instant to, Pageable pageable);
    Page<Transaction> findByCompanyIdAndWarehouseIdAndTypeAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(UUID companyId, UUID warehouseId, TransactionType type, Instant from, Instant to, Pageable pageable);
    List<Transaction> findByCompanyIdAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(UUID companyId, Instant from, Instant to);
    List<Transaction> findByCompanyIdAndWarehouseIdAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(UUID companyId, UUID warehouseId, Instant from, Instant to);
    boolean existsByCompanyIdAndRefDocumentIdAndType(UUID companyId, UUID refDocumentId, TransactionType type);
}
