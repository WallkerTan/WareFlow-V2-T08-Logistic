package com.example.inventory_service.repository;
import com.example.inventory_service.entity.TradeOperation;
import org.springframework.data.jpa.repository.*;
import jakarta.persistence.LockModeType;
import java.util.*;
public interface TradeOperationRepository extends JpaRepository<TradeOperation,UUID> {
    List<TradeOperation> findByWarehouseIdOrderByCreatedAtDesc(UUID warehouseId);
    List<TradeOperation> findTop50ByStatusOrderByCreatedAtAsc(String status);
    @Query("select o.companyId from TradeOperation o where o.id=:id")
    Optional<UUID> companyId(UUID id);
    @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select o from TradeOperation o where o.id=:id")
    Optional<TradeOperation> lock(UUID id);
}
