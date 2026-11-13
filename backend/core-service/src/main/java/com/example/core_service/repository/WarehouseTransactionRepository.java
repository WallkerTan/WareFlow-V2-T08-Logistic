package com.example.core_service.repository;

import com.example.core_service.entity.WarehouseTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface WarehouseTransactionRepository extends JpaRepository<WarehouseTransaction, UUID>,
        JpaSpecificationExecutor<WarehouseTransaction> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select t from WarehouseTransaction t where t.id = :id")
    java.util.Optional<WarehouseTransaction> lockById(UUID id);
}
