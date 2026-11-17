package com.example.core_service.repository;

import com.example.core_service.entity.WarehouseTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface WarehouseTransactionRepository extends JpaRepository<WarehouseTransaction, UUID>,
        JpaSpecificationExecutor<WarehouseTransaction> {
}
