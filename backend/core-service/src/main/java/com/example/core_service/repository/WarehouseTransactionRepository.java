package com.example.core_service.repository;

import com.example.core_service.entity.WarehouseTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.UUID;
import java.util.Optional;
import java.util.List;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.domain.Pageable;
import com.example.core_service.entity.enums.WarehouseTransactionStatus;
import com.example.core_service.entity.enums.WarehouseTransactionType;

@Repository
public interface WarehouseTransactionRepository extends JpaRepository<WarehouseTransaction, UUID>,
        JpaSpecificationExecutor<WarehouseTransaction> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from WarehouseTransaction t where t.id = :id")
    Optional<WarehouseTransaction> findForUpdate(UUID id);

    @Query("select t from WarehouseTransaction t where t.status = :status and t.type <> :excludedType and coalesce(t.offeredPrice, t.warehouse.price) > 0 and not exists (select e.id from WarehouseFinanceEvent e where e.id = t.id) order by t.createdAt")
    List<WarehouseTransaction> findUnrecorded(WarehouseTransactionStatus status, WarehouseTransactionType excludedType, Pageable pageable);
}
