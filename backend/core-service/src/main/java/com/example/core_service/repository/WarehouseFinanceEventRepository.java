package com.example.core_service.repository;

import com.example.core_service.entity.WarehouseFinanceEvent;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import java.time.Instant;
import java.util.*;

public interface WarehouseFinanceEventRepository extends JpaRepository<WarehouseFinanceEvent, UUID> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select e from WarehouseFinanceEvent e where e.id = :id")
    Optional<WarehouseFinanceEvent> findForUpdate(UUID id);
    @Query("select e.id from WarehouseFinanceEvent e where e.deliveredAt is null and (e.retryAt is null or e.retryAt <= :now) order by e.occurredAt")
    List<UUID> pending(Instant now, Pageable pageable);
}
